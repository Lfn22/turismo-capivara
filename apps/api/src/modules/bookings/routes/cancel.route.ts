import { FastifyInstance } from 'fastify'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { getResend, getEmailFrom } from '../../../shared/email'
import { bookingCancelledEmailText } from '../emails/booking-cancelled-email'
import { cancelSelfBodySchema, type CancelSelfBody } from '../bookings.schemas'
import { auditLog } from '../../../shared/audit.js'
import { bookingsCancelledCounter } from '../../../shared/metrics.js'
import { Sentry } from '../../../shared/sentry'

export async function cancelSelfRoute(app: FastifyInstance) {
  // POST /tenants/:slug/bookings/cancel-self — public, no JWT
  app.post<{ Params: { slug: string }; Body: CancelSelfBody }>(
    '/tenants/:slug/bookings/cancel-self',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '15 minutes',
          keyGenerator: (req) => req.ip,
        },
      },
    },
    async (request, reply) => {
      const parsed = cancelSelfBodySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' })
      }
      const { slug } = request.params
      const { token } = parsed.data

      Sentry.setTag('module', 'bookings')
      Sentry.setTag('tenant', slug)
      Sentry.setTag('action', 'cancel')

      const tenant = await prisma.tenant.findUnique({ where: { slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)

      const booking = await prisma.booking.findFirst({
        where: { cancelToken: token, tenantId: tenant.id },
        include: {
          slot: { select: { startsAt: true, package: { select: { name: true } } } },
        },
      })

      if (!booking) {
        throw new AppError('Reserva não encontrada ou dados inválidos', 404)
      }

      if (booking.cancelTokenExpiresAt && booking.cancelTokenExpiresAt < new Date()) {
        throw new AppError('Token de cancelamento expirado. Entre em contato com a operadora.', 410)
      }

      // 24h cutoff check (D-04)
      const cutoffMs = 24 * 60 * 60 * 1000
      if (booking.slot.startsAt.getTime() - Date.now() < cutoffMs) {
        throw new AppError('Cancelamento não permitido — menos de 24h até a partida', 422)
      }

      if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
        throw new AppError('Reserva não pode ser cancelada neste status', 422)
      }

      // Atomic cancel + slot release (D-04)
      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: 'CANCELLED' },
        })
        const currentSlot = await tx.departureSlot.findUnique({
          where: { id: booking.slotId },
          select: { booked: true, status: true },
        })
        const newBooked = Math.max(0, (currentSlot?.booked ?? booking.pax) - booking.pax)
        await tx.departureSlot.update({
          where: { id: booking.slotId },
          data: {
            booked: newBooked,
            ...(currentSlot?.status === 'FULL' ? { status: 'OPEN' } : {}),
          },
        })
      })

      bookingsCancelledCounter.add(1)

      // Fire-and-forget cancellation email (D-07)
      const resend = getResend()
      if (resend) {
        resend.emails
          .send({
            from: getEmailFrom(),
            to: [booking.customerEmail],
            subject: 'Cancelamento confirmado — CAPI',
            text: bookingCancelledEmailText({
              customerName: booking.customerName,
              packageName: booking.slot.package.name,
              startsAt: booking.slot.startsAt,
            }),
          })
          .catch((emailErr: unknown) => {
            app.log.warn({ err: emailErr }, '[email] Failed to send cancellation email')
          })
      }

      auditLog(prisma, { actorType: 'USER', action: 'booking.cancelled', targetType: 'BOOKING', targetId: booking.id, ipAddress: request.ip, metadata: { tenantSlug: slug, previousStatus: booking.status } })

      return reply.status(200).send({ message: 'Reserva cancelada com sucesso' })
    }
  )
}
