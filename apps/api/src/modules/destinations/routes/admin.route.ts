import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { parseBody, parseParams, parseQuery } from '../../../shared/utils/zod-error'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { authenticate } from '../../../shared/middlewares/authenticate'
import { authorize } from '../../../shared/middlewares/authorize'
import { ApprovalUpdateInput } from '../destinations.schemas'
import { approveDestination, rejectDestination } from '../destinations.service'
import { auditLog } from '../../../shared/audit.js'
import { Sentry } from '../../../shared/sentry'

export async function adminDestinationsRoute(app: FastifyInstance) {
  // PATCH /destinations/:destinationSlug — atualiza fotos (ADMIN/SUPER_ADMIN/CONDUTOR)
  // CONDUTOR só pode editar o destino vinculado ao seu próprio tenant
  // NOTE: Esta rota chama prisma.destination.update() diretamente, sem passar por updateDestination().
  // Isso é intencional: o serviço updateDestination() bloqueia edições em destinos APPROVED para
  // usuários não-admin. Admins precisam editar destinos aprovados via esta rota. Qualquer refatoração
  // que redirecione esta rota pelo serviço deve preservar essa distinção explicitamente.
  app.patch(
    '/destinations/:destinationSlug',
    { preHandler: [authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'CONDUTOR'])] },
    async (request, reply) => {
      const destinationParamsSchema = z.object({
        destinationSlug: z.string().min(1, { message: 'Slug obrigatório' }),
      })
      const { data: rawParams, error: paramsError } = parseParams(destinationParamsSchema, request.params, reply)
      if (paramsError) return
      const params = { slug: rawParams.destinationSlug }

      // Escopo de tenant: CONDUTOR só edita o destino do seu próprio tenant
      if (request.user.role === 'CONDUTOR') {
        const tenant = await prisma.tenant.findUnique({
          where: { id: request.user.tenantId },
          select: { destination: { select: { slug: true } } },
        })
        if (tenant?.destination?.slug !== params.slug) {
          throw new AppError('Acesso negado a este destino', 403)
        }
      }

      const bodySchema = z.object({
        heroImageUrl: z.string().url().nullable().optional(),
        photos: z.array(z.string().url()).max(5).optional(),
        title: z.string().min(1).optional(),
        subtitle: z.string().nullable().optional(),
        description: z.string().optional(),
        highlights: z.array(z.string().min(1)).optional(),
        tagline: z.string().nullable().optional(),
      })

      const { data: body, error: bodyError } = parseBody(bodySchema, request.body, reply)
      if (bodyError) return

      const destination = await prisma.destination.findUnique({
        where: { slug: params.slug },
        select: { id: true },
      })

      if (!destination) throw new AppError('Destino não encontrado', 404)

      const updated = await prisma.destination.update({
        where: { slug: params.slug },
        data: {
          ...(body.heroImageUrl !== undefined && { heroImageUrl: body.heroImageUrl }),
          ...(body.photos !== undefined && { photos: body.photos }),
          ...(body.title !== undefined && { title: body.title }),
          ...(body.subtitle !== undefined && { subtitle: body.subtitle }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.highlights !== undefined && { highlights: body.highlights }),
          ...(body.tagline !== undefined && { tagline: body.tagline }),
        },
        select: {
          slug: true,
          heroImageUrl: true,
          photos: true,
        },
      })

      return reply.status(200).send(updated)
    },
  )

  // PATCH /destinations/:id/approve — super-admin aprova ou rejeita destino
  app.patch(
    '/destinations/:id/approve',
    { preHandler: [authenticate, authorize(['ADMIN', 'SUPER_ADMIN'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const { data: input, error: inputError } = parseBody(ApprovalUpdateInput, request.body, reply)
      if (inputError) return

      Sentry.setTag('module', 'destinations')
      Sentry.setTag('action', input.approvalStatus === 'APPROVED' ? 'approve' : 'reject')

      const destination =
        input.approvalStatus === 'APPROVED'
          ? await approveDestination(id)
          : await rejectDestination(id, input.rejectionReason)

      if (input.approvalStatus === 'APPROVED') {
        auditLog(prisma, { actorType: 'USER', actorId: (request.user as { sub: string }).sub, action: 'destination.approved', targetType: 'DESTINATION', targetId: destination.id, ipAddress: request.ip, metadata: { destinationName: destination.title } })
      }

      return reply.status(200).send(destination)
    },
  )

  // GET /admin/destinations — listagem completa para admin (ADMIN/SUPER_ADMIN)
  app.get(
    '/admin/destinations',
    { preHandler: [authenticate, authorize(['ADMIN', 'SUPER_ADMIN'])] },
    async (request, reply) => {
      const querySchema = z.object({
        limit: z.coerce.number().int().min(1).max(100).default(50),
        offset: z.coerce.number().int().min(0).default(0),
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
      })

      const { data: query, error: queryError } = parseQuery(querySchema, request.query, reply)
      if (queryError) return

      const where = query.status ? { approvalStatus: query.status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {}

      const [destinations, total] = await Promise.all([
        prisma.destination.findMany({
          where,
          select: {
            id: true,
            slug: true,
            title: true,
            state: true,
            heroImageUrl: true,
            approvalStatus: true,
            rejectionReason: true,
            createdAt: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
                tenant: { select: { name: true, slug: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: query.limit,
          skip: query.offset,
        }),
        prisma.destination.count({ where }),
      ])

      return reply.status(200).send({ destinations, total, limit: query.limit, offset: query.offset })
    },
  )

  // GET /admin/destinations/pending — fila de aprovação (ADMIN)
  app.get(
    '/admin/destinations/pending',
    { preHandler: [authenticate, authorize(['ADMIN', 'SUPER_ADMIN'])] },
    async (request, reply) => {
      const querySchema = z.object({
        limit: z.coerce.number().int().min(1).max(100).default(50),
        offset: z.coerce.number().int().min(0).default(0),
      })

      const { data: query, error: queryError } = parseQuery(querySchema, request.query, reply)
      if (queryError) return

      const [destinations, total] = await Promise.all([
        prisma.destination.findMany({
          where: { approvalStatus: 'PENDING' },
          select: {
            id: true,
            slug: true,
            title: true,
            state: true,
            heroImageUrl: true,
            approvalStatus: true,
            createdAt: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
                tenant: { select: { name: true, slug: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
          take: query.limit,
          skip: query.offset,
        }),
        prisma.destination.count({ where: { approvalStatus: 'PENDING' } }),
      ])

      return reply.status(200).send({ destinations, total, limit: query.limit, offset: query.offset })
    },
  )
}
