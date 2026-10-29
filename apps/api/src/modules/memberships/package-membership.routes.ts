import { FastifyInstance, FastifyRequest } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { isPlatformStaff } from '../../shared/auth/roles'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { resolveAction } from '../notifications/notifications.service'
import {
  notifyGuideJoinedPackage,
  notifyPackageDecision,
  notifyPackageLeft,
  notifyPackageRequest,
} from '../notifications/guide-events'
import { findGuideFutureBookings, MembershipBooking } from './future-bookings'

const packageParamsSchema = z.object({
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

const requestParamsSchema = packageParamsSchema.extend({
  packageGuideId: z.string().min(1, { message: 'ID obrigatório' }),
})

const rejectBodySchema = z.object({
  reason: z
    .string({ message: 'Motivo obrigatório' })
    .trim()
    .min(3, { message: 'Motivo deve ter no mínimo 3 caracteres' })
    .max(300, { message: 'Motivo deve ter no máximo 300 caracteres' }),
})

function zodError(err: ZodError) {
  return {
    message: 'Dados inválidos',
    errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
  }
}

function toMembershipBookings(
  bookings: Array<{ id: string; startsAt: Date; packageName: string }>,
): MembershipBooking[] {
  return bookings.map((b) => ({ id: b.id, startsAt: b.startsAt.toISOString(), packageName: b.packageName }))
}

/** Quem decide pedido de roteiro: equipe, ADMIN do tenant dono, ou o condutor se o tenant for `independente`. */
export function canDecidePackageRequest(
  user: { sub: string; role: string; tenantId: string },
  pkg: { tenantId: string; conductorId: string | null; tenant: { slug: string } },
): boolean {
  if (isPlatformStaff(user.role)) return true
  if (user.role === 'ADMIN') return user.tenantId === pkg.tenantId
  if (user.role === 'CONDUTOR') {
    return pkg.tenant.slug === 'independente' && pkg.conductorId === user.sub
  }
  return false
}

async function findPackage(id: string) {
  const pkg = await prisma.tourPackage.findUnique({
    where: { id },
    select: {
      id: true,
      tenantId: true,
      conductorId: true,
      active: true,
      tenant: { select: { slug: true, name: true } },
      conductor: { select: { name: true } },
    },
  })
  if (!pkg) throw new AppError('Roteiro não encontrado', 404)
  return pkg
}

async function loadGuide(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, approvalStatus: true, guideProfile: { select: { id: true } } },
  })
}

export async function packageMembershipRoutes(app: FastifyInstance) {
  app.setErrorHandler((err, _request, reply) => {
    if (err instanceof ZodError) return reply.status(400).send(zodError(err))
    throw err
  })

  // GET /packages/:id/membership — situação do usuário logado no roteiro
  app.get('/packages/:id/membership', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const { id } = packageParamsSchema.parse(request.params)
    const pkg = await findPackage(id)
    const user = request.user as { sub: string; role: string }

    const ownerName = pkg.tenant.slug === 'independente' ? (pkg.conductor?.name ?? pkg.tenant.name) : pkg.tenant.name
    const respond = (state: string, rejectionReason: string | null = null, bookings: MembershipBooking[] = []) =>
      reply.send({ state, ownerName, rejectionReason, bookings })

    if (user.role !== 'CONDUTOR') return respond('NOT_GUIDE')

    const guide = await loadGuide(user.sub)
    if (!guide || guide.approvalStatus !== 'APPROVED' || !guide.guideProfile) return respond('UNVERIFIED')
    if (pkg.conductorId === user.sub) return respond('CONDUCTOR')

    const guideProfileId = guide.guideProfile.id
    const link = await prisma.packageGuide.findUnique({
      where: { packageId_guideId: { packageId: id, guideId: guideProfileId } },
      select: { status: true, rejectionReason: true },
    })
    if (!link || link.status === 'LEFT') return respond('OUT')
    if (link.status === 'PENDING') return respond('PENDING')
    if (link.status === 'REJECTED') return respond('REJECTED', link.rejectionReason)

    const bookings = await findGuideFutureBookings({ userId: user.sub, guideProfileId, packageId: id })
    return respond(bookings.length > 0 ? 'IN_WITH_BOOKINGS' : 'IN', null, toMembershipBookings(bookings))
  })

  // POST /packages/:id/guides/me — guia verificado pede para atuar no roteiro
  app.post('/packages/:id/guides/me', {
    preHandler: [authenticate, authorize(['CONDUTOR'])],
  }, async (request, reply) => {
    const { id } = packageParamsSchema.parse(request.params)
    const user = request.user as { sub: string }

    const guide = await loadGuide(user.sub)
    if (!guide || guide.approvalStatus !== 'APPROVED' || !guide.guideProfile) {
      throw new AppError('Disponível após verificação', 403)
    }
    const guideId = guide.guideProfile.id

    const pkg = await findPackage(id)
    if (!pkg.active) throw new AppError('Roteiro não encontrado', 404)
    if (pkg.conductorId === user.sub) {
      throw new AppError('Você é o guia responsável por este roteiro', 409)
    }

    const existing = await prisma.packageGuide.findUnique({
      where: { packageId_guideId: { packageId: id, guideId } },
      select: { status: true },
    })
    if (existing?.status === 'PENDING') return reply.status(200).send({ state: 'PENDING' })
    if (existing?.status === 'ACCEPTED') return reply.status(200).send({ state: 'IN' })

    let packageGuide: { id: string }
    try {
      packageGuide = await prisma.packageGuide.upsert({
        where: { packageId_guideId: { packageId: id, guideId } },
        create: { packageId: id, guideId, status: 'PENDING' },
        update: { status: 'PENDING', rejectionReason: null, decidedAt: null },
        select: { id: true },
      })
    } catch (err) {
      // Clique duplo concorrente: a outra requisição já criou a linha
      if ((err as { code?: string }).code === 'P2002') return reply.status(200).send({ state: 'PENDING' })
      throw err
    }

    void notifyPackageRequest(app.log, packageGuide.id).catch(() => {})
    return reply.status(201).send({ state: 'PENDING' })
  })

  // DELETE /packages/:id/guides/me — guia cancela o pedido ou sai do roteiro (bloqueado com reserva futura)
  app.delete('/packages/:id/guides/me', {
    preHandler: [authenticate, authorize(['CONDUTOR'])],
  }, async (request, reply) => {
    const { id } = packageParamsSchema.parse(request.params)
    const user = request.user as { sub: string }

    const guide = await loadGuide(user.sub)
    if (!guide?.guideProfile) return reply.status(204).send()
    const guideId = guide.guideProfile.id

    const link = await prisma.packageGuide.findUnique({
      where: { packageId_guideId: { packageId: id, guideId } },
      select: { id: true, status: true },
    })
    if (!link) return reply.status(204).send()

    if (link.status === 'PENDING') {
      const { count } = await prisma.packageGuide.updateMany({
        where: { id: link.id, status: 'PENDING' },
        data: { status: 'LEFT' },
      })
      if (count > 0) void resolveAction(`package-request:${link.id}`, guide.name).catch(() => {})
      return reply.status(204).send()
    }

    if (link.status === 'ACCEPTED') {
      const pkg = await findPackage(id)
      if (pkg.conductorId === user.sub) {
        throw new AppError('Você é o guia responsável por este roteiro', 409)
      }

      const bookings = await findGuideFutureBookings({ userId: user.sub, guideProfileId: guideId, packageId: id })
      if (bookings.length > 0) {
        return reply.status(409).send({
          message: 'Você tem reservas pendentes, fale com o admin',
          bookings: toMembershipBookings(bookings),
        })
      }

      const { count } = await prisma.packageGuide.updateMany({
        where: { id: link.id, status: 'ACCEPTED' },
        data: { status: 'LEFT' },
      })
      if (count > 0) void notifyPackageLeft(app.log, link.id).catch(() => {})
    }

    return reply.status(204).send()
  })

  async function decide(
    request: FastifyRequest,
    decision: { status: 'ACCEPTED' } | { status: 'REJECTED'; reason: string },
  ) {
    const { id, packageGuideId } = requestParamsSchema.parse(request.params)
    const user = request.user as { sub: string; role: string; tenantId: string }

    const pkg = await findPackage(id)
    if (!canDecidePackageRequest(user, pkg)) throw new AppError('Acesso negado', 403)

    const pg = await prisma.packageGuide.findUnique({
      where: { id: packageGuideId },
      select: { id: true, packageId: true, guide: { select: { userId: true, user: { select: { approvalStatus: true } } } } },
    })
    if (!pg || pg.packageId !== id) throw new AppError('Pedido não encontrado', 404)

    if (decision.status === 'ACCEPTED' && pg.guide.user.approvalStatus !== 'APPROVED') {
      throw new AppError('Guia não está verificado', 409)
    }

    const { count } = await prisma.packageGuide.updateMany({
      where: {
        id: pg.id,
        status: 'PENDING',
        ...(decision.status === 'ACCEPTED' ? { guide: { user: { approvalStatus: 'APPROVED' as const } } } : {}),
      },
      data:
        decision.status === 'ACCEPTED'
          ? { status: 'ACCEPTED', decidedAt: new Date(), rejectionReason: null }
          : { status: 'REJECTED', decidedAt: new Date(), rejectionReason: decision.reason },
    })
    if (count === 0) throw new AppError('Pedido já decidido', 409)

    void notifyPackageDecision(app.log, pg.id, user.sub).catch(() => {})
    if (decision.status === 'ACCEPTED') {
      void notifyGuideJoinedPackage(app.log, pg.guide.userId, id).catch(() => {})
    }
  }

  // PATCH /packages/:id/guide-requests/:packageGuideId/accept
  app.patch('/packages/:id/guide-requests/:packageGuideId/accept', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    await decide(request, { status: 'ACCEPTED' })
    return reply.send({ message: 'Pedido aceito' })
  })

  // PATCH /packages/:id/guide-requests/:packageGuideId/reject
  app.patch('/packages/:id/guide-requests/:packageGuideId/reject', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const { reason } = rejectBodySchema.parse(request.body ?? {})
    await decide(request, { status: 'REJECTED', reason })
    return reply.send({ message: 'Pedido recusado' })
  })
}
