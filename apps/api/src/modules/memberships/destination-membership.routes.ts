import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { notifyDestinationMembership } from '../notifications/guide-events'
import { findGuideFutureBookings, MembershipBooking } from './future-bookings'

// Atenção: o parâmetro NÃO pode se chamar `slug`, senão authenticate() o trata como slug de tenant.
const paramsSchema = z.object({
  destinationSlug: z.string().min(1, { message: 'Slug obrigatório' }),
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

async function findPublicDestination(destinationSlug: string) {
  const destination = await prisma.destination.findFirst({
    where: { slug: destinationSlug, active: true, approvalStatus: 'APPROVED' },
    select: { id: true },
  })
  if (!destination) throw new AppError('Destino não encontrado', 404)
  return destination
}

async function loadGuide(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { approvalStatus: true, guideProfile: { select: { id: true } } },
  })
}

export async function destinationMembershipRoutes(app: FastifyInstance) {
  app.setErrorHandler((err, _request, reply) => {
    if (err instanceof ZodError) return reply.status(400).send(zodError(err))
    throw err
  })

  // GET /destinations/:destinationSlug/membership — situação do usuário logado no destino
  app.get('/destinations/:destinationSlug/membership', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const { destinationSlug } = paramsSchema.parse(request.params)
    const destination = await findPublicDestination(destinationSlug)
    const user = request.user as { sub: string; role: string }

    if (user.role !== 'CONDUTOR') return reply.send({ state: 'NOT_GUIDE', bookings: [] })

    const guide = await loadGuide(user.sub)
    if (!guide || guide.approvalStatus !== 'APPROVED' || !guide.guideProfile) {
      return reply.send({ state: 'UNVERIFIED', bookings: [] })
    }

    const link = await prisma.guideDestination.findUnique({
      where: { guideId_destinationId: { guideId: guide.guideProfile.id, destinationId: destination.id } },
      select: { id: true },
    })
    if (!link) return reply.send({ state: 'OUT', bookings: [] })

    const bookings = await findGuideFutureBookings({
      userId: user.sub,
      guideProfileId: guide.guideProfile.id,
      destinationId: destination.id,
    })
    return reply.send({
      state: bookings.length > 0 ? 'IN_WITH_BOOKINGS' : 'IN',
      bookings: toMembershipBookings(bookings),
    })
  })

  // POST /destinations/:destinationSlug/guides/me — guia verificado entra no destino
  app.post('/destinations/:destinationSlug/guides/me', {
    preHandler: [authenticate, authorize(['CONDUTOR'])],
  }, async (request, reply) => {
    const { destinationSlug } = paramsSchema.parse(request.params)
    const destination = await findPublicDestination(destinationSlug)
    const user = request.user as { sub: string }

    const guide = await loadGuide(user.sub)
    if (!guide || guide.approvalStatus !== 'APPROVED' || !guide.guideProfile) {
      throw new AppError('Disponível após verificação', 403)
    }
    const guideId = guide.guideProfile.id

    const existing = await prisma.guideDestination.findUnique({
      where: { guideId_destinationId: { guideId, destinationId: destination.id } },
      select: { id: true },
    })
    if (existing) return reply.status(200).send({ state: 'IN' })

    try {
      await prisma.guideDestination.create({ data: { guideId, destinationId: destination.id } })
    } catch (err) {
      // Clique duplo concorrente: a outra requisição já criou a linha
      if ((err as { code?: string }).code === 'P2002') return reply.status(200).send({ state: 'IN' })
      throw err
    }

    void notifyDestinationMembership(app.log, user.sub, destination.id, 'joined').catch(() => {})
    return reply.status(201).send({ state: 'IN' })
  })

  // DELETE /destinations/:destinationSlug/guides/me — guia sai do destino (bloqueado com reserva futura)
  app.delete('/destinations/:destinationSlug/guides/me', {
    preHandler: [authenticate, authorize(['CONDUTOR'])],
  }, async (request, reply) => {
    const { destinationSlug } = paramsSchema.parse(request.params)
    const destination = await findPublicDestination(destinationSlug)
    const user = request.user as { sub: string }

    const guide = await loadGuide(user.sub)
    if (!guide?.guideProfile) return reply.status(204).send()
    const guideId = guide.guideProfile.id

    const link = await prisma.guideDestination.findUnique({
      where: { guideId_destinationId: { guideId, destinationId: destination.id } },
      select: { id: true },
    })
    if (!link) return reply.status(204).send()

    const bookings = await findGuideFutureBookings({
      userId: user.sub,
      guideProfileId: guideId,
      destinationId: destination.id,
    })
    if (bookings.length > 0) {
      return reply.status(409).send({
        message: 'Você tem reservas pendentes, fale com o admin',
        bookings: toMembershipBookings(bookings),
      })
    }

    const { count } = await prisma.guideDestination.deleteMany({ where: { id: link.id } })
    if (count > 0) void notifyDestinationMembership(app.log, user.sub, destination.id, 'left').catch(() => {})
    return reply.status(204).send()
  })
}
