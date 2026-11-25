import type { FastifyBaseLogger } from 'fastify'
import type { Prisma } from '@prisma/client'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { getResend, getEmailFrom } from '../../shared/email'
import { notifyBookingEvent } from '../notifications/booking-events'
import { cancelBooking } from './cancel-booking'
import { bookingCancelledByOperatorEmailText } from './emails/booking-cancelled-email'

/**
 * Cancela as datas futuras (OPEN/FULL) que casam com `where` e todas as reservas ativas
 * delas — com estorno das pagas (regra de negócio: arquivar/despublicar roteiro ou guia
 * saindo cancela e estorna tudo). Se um estorno falhar, interrompe com erro: o que já
 * foi cancelado fica, e repetir a ação termina o resto.
 */
export async function cancelFutureSlots(
  where: Prisma.DepartureSlotWhereInput,
  log: Pick<FastifyBaseLogger, 'warn' | 'error'>,
): Promise<{ slotsCancelled: number; bookingsCancelled: number }> {
  const slots = await prisma.departureSlot.findMany({
    where: { ...where, status: { in: ['OPEN', 'FULL'] }, startsAt: { gt: new Date() } },
    select: {
      id: true,
      startsAt: true,
      package: { select: { name: true } },
      bookings: {
        where: { status: { in: ['PENDING', 'CONFIRMED'] } },
        select: {
          id: true,
          status: true,
          slotId: true,
          pax: true,
          paymentId: true,
          customerName: true,
          customerEmail: true,
        },
      },
    },
  })
  if (slots.length === 0) return { slotsCancelled: 0, bookingsCancelled: 0 }

  let bookingsCancelled = 0
  for (const slot of slots) {
    for (const booking of slot.bookings) {
      try {
        await cancelBooking(booking, log)
      } catch (err) {
        // 409: outra operação (webhook, cliente, job) já mudou esta reserva — segue
        if (err instanceof AppError && err.statusCode === 409) continue
        throw err
      }
      bookingsCancelled++
      void notifyBookingEvent(log as FastifyBaseLogger, booking.id, 'cancelled').catch(() => {})
      const resend = getResend()
      if (resend) {
        resend.emails
          .send({
            from: getEmailFrom(),
            to: [booking.customerEmail],
            subject: 'Sua reserva foi cancelada — CAPI',
            text: bookingCancelledByOperatorEmailText({
              customerName: booking.customerName,
              packageName: slot.package.name,
              startsAt: slot.startsAt,
              refunded: booking.status === 'CONFIRMED',
            }),
          })
          .catch((err: unknown) => {
            log.warn({ err, bookingId: booking.id }, '[cancel-slots] Falha ao enviar e-mail')
          })
      }
    }
  }

  const { count } = await prisma.departureSlot.updateMany({
    where: { id: { in: slots.map((s) => s.id) } },
    data: { status: 'CANCELLED' },
  })
  return { slotsCancelled: count, bookingsCancelled }
}
