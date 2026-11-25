import { FastifyInstance } from 'fastify'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { getResend, getEmailFrom } from '../../../shared/email'
import { bookingCancelledEmailText } from '../emails/booking-cancelled-email'
import { cancelSelfBodySchema, type CancelSelfBody } from '../bookings.schemas'
import { auditLog } from '../../../shared/audit.js'
import { bookingsCancelledCounter } from '../../../shared/metrics.js'
import { Sentry } from '../../../shared/sentry'
import { notifyBookingEvent } from '../../notifications/booking-events'
import { cancelBooking } from '../cancel-booking'
import { clientIp } from '../../../shared/utils/client-ip'

export async function cancelSelfRoute(app: FastifyInstance) {
  // POST /tenants/:slug/bookings/cancel-self — public, no JWT
  app.post<{ Params: { slug: string }; Body: CancelSelfBody }>(
    '/tenants/:slug/bookings/cancel-self',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '15 minutes',
          keyGenerator: (req) => clientIp(req),
        },
      },
    },
    async (request, reply) => {
      const parsed = cancelSelfBodySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ message: parsed.error.issues[0]?.message ?? 'Dados inválidos' })
      }
      const { slug } = request.params
      const input = parsed.data

      Sentry.setTag('module', 'bookings')
      Sentry.setTag('tenant', slug)
      Sentry.setTag('action', 'cancel')

      const tenant = await prisma.tenant.findUnique({ where: { slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)

      const byToken = 'token' in input
      const booking = await prisma.booking.findFirst({
        where: byToken
          ? { cancelToken: input.token, tenantId: tenant.id }
          : { code: input.code.toLowerCase(), tenantId: tenant.id },
        include: {
          slot: { select: { startsAt: true, package: { select: { name: true } } } },
        },
      })

      // 404 opaco tanto para reserva inexistente quanto para e-mail divergente
      if (
        !booking ||
        (!byToken && booking.customerEmail.toLowerCase() !== input.email.trim().toLowerCase())
      ) {
        throw new AppError('Reserva não encontrada ou dados inválidos', 404)
      }

      if (byToken && booking.cancelTokenExpiresAt && booking.cancelTokenExpiresAt < new Date()) {
        throw new AppError('Token de cancelamento expirado. Entre em contato com a operadora.', 410)
      }

      // Passeio já iniciado: nem o CDC permite cancelar (e liberar a vaga) depois da partida
      if (booking.slot.startsAt.getTime() <= Date.now()) {
        throw new AppError('Cancelamento não permitido — o passeio já começou', 422)
      }

      // CDC Art.49: direito de arrependimento — 7 dias a contar da compra
      const cdcCoolingMs = 7 * 24 * 60 * 60 * 1000
      const withinCdcPeriod = Date.now() - booking.createdAt.getTime() <= cdcCoolingMs

      if (!withinCdcPeriod) {
        // Fora do período de arrependimento: cutoff de 24h antes da partida
        const cutoffMs = 24 * 60 * 60 * 1000
        if (booking.slot.startsAt.getTime() - Date.now() < cutoffMs) {
          throw new AppError('Cancelamento não permitido — menos de 24h até a partida', 422)
        }
      }

      // Estorno (CONFIRMED) / cancelamento do PIX (PENDING) + cancelamento atômico (D-04)
      await cancelBooking(booking, request.log)

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

      auditLog(prisma, {
        actorType: 'USER',
        action: 'booking.cancelled',
        targetType: 'BOOKING',
        targetId: booking.id,
        ipAddress: clientIp(request),
        metadata: { tenantSlug: slug, previousStatus: booking.status },
      })

      void notifyBookingEvent(app.log, booking.id, 'cancelled').catch(() => {})

      return reply.status(200).send({ message: 'Reserva cancelada com sucesso' })
    },
  )
}
