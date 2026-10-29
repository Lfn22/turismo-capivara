import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { isPlatformStaff } from '../../shared/auth/roles'
import { notifyAffiliationDecision } from '../notifications/guide-events'

const slugParamsSchema = z.object({ slug: z.string().min(1, { message: 'Slug obrigatório' }) })
const idParamsSchema = z.object({ id: z.string().min(1, { message: 'ID obrigatório' }) })
const listQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']).default('PENDING'),
})
const rejectBodySchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, { message: 'Motivo deve ter ao menos 3 caracteres' })
    .max(300, { message: 'Motivo deve ter no máximo 300 caracteres' }),
})

function zodError(err: ZodError) {
  return {
    message: 'Dados inválidos',
    errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
  }
}

export async function affiliationsRoutes(app: FastifyInstance) {
  app.setErrorHandler((err, _request, reply) => {
    if (err instanceof ZodError) return reply.status(400).send(zodError(err))
    throw err
  })

  // GET /tenants/:slug/admin/affiliations?status= — ADMIN da agência ou equipe
  app.get('/tenants/:slug/admin/affiliations', {
    preHandler: [authenticate, authorize(['ADMIN', 'SUPER_ADMIN'])],
  }, async (request, reply) => {
    const { slug } = slugParamsSchema.parse(request.params)
    const query = listQuerySchema.parse(request.query)

    const tenant = await prisma.tenant.findUnique({ where: { slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    const user = request.user as { role: string; tenantId: string }
    if (!isPlatformStaff(user.role) && !(user.role === 'ADMIN' && user.tenantId === tenant.id)) {
      throw new AppError('Acesso negado', 403)
    }

    const affiliations = await prisma.guideAffiliation.findMany({
      where: { tenantId: tenant.id, status: query.status },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        guide: {
          select: { user: { select: { id: true, name: true, email: true, approvalStatus: true } } },
        },
      },
    })

    return reply.status(200).send({
      affiliations: affiliations.map((a) => ({
        id: a.id,
        status: a.status,
        createdAt: a.createdAt,
        guide: {
          userId: a.guide.user.id,
          name: a.guide.user.name,
          email: a.guide.user.email,
          approvalStatus: a.guide.user.approvalStatus,
        },
      })),
    })
  })

  // Carrega o pedido e confere quem pode decidir: equipe, ou ADMIN do tenant da afiliação
  async function loadDecidable(request: { params: unknown; user: unknown }) {
    const { id } = idParamsSchema.parse(request.params)
    const user = request.user as { sub: string; role: string; tenantId: string }

    const affiliation = await prisma.guideAffiliation.findUnique({
      where: { id },
      select: { id: true, tenantId: true, status: true, guide: { select: { userId: true } } },
    })
    if (!affiliation) throw new AppError('Pedido não encontrado', 404)

    const allowed =
      isPlatformStaff(user.role) || (user.role === 'ADMIN' && user.tenantId === affiliation.tenantId)
    if (!allowed) throw new AppError('Acesso negado', 403)

    if (affiliation.status !== 'PENDING') throw new AppError('Pedido já decidido', 409)

    return { affiliation, deciderId: user.sub }
  }

  // PATCH /affiliations/:id/accept
  app.patch('/affiliations/:id/accept', { preHandler: [authenticate] }, async (request, reply) => {
    const { affiliation, deciderId } = await loadDecidable(request)

    const ownPackage = await prisma.tourPackage.findFirst({
      where: { conductorId: affiliation.guide.userId, tenant: { slug: 'independente' } },
      select: { id: true },
    })
    if (ownPackage) {
      throw new AppError('Este guia já tem roteiros como autônomo. Fale com a equipe CAPI para transferir.', 409)
    }

    await prisma.$transaction(async (tx) => {
      const { count } = await tx.guideAffiliation.updateMany({
        where: { id: affiliation.id, status: 'PENDING' },
        data: { status: 'ACCEPTED' },
      })
      if (count === 0) throw new AppError('Pedido já decidido', 409)
      await tx.user.update({ where: { id: affiliation.guide.userId }, data: { tenantId: affiliation.tenantId } })
    })

    void notifyAffiliationDecision(app.log, affiliation.id, deciderId).catch(() => {})

    return reply.status(200).send({ message: 'Vínculo confirmado' })
  })

  // PATCH /affiliations/:id/reject
  app.patch('/affiliations/:id/reject', { preHandler: [authenticate] }, async (request, reply) => {
    const body = rejectBodySchema.parse(request.body)
    const { affiliation, deciderId } = await loadDecidable(request)

    const { count } = await prisma.guideAffiliation.updateMany({
      where: { id: affiliation.id, status: 'PENDING' },
      data: { status: 'REJECTED', rejectionReason: body.reason },
    })
    if (count === 0) throw new AppError('Pedido já decidido', 409)

    void notifyAffiliationDecision(app.log, affiliation.id, deciderId).catch(() => {})

    return reply.status(200).send({ message: 'Vínculo recusado' })
  })
}
