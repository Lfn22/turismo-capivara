import { FastifyInstance } from 'fastify'
import prisma from '../../database'
import { getResend, getEmailFrom } from '../../shared/email'
import { withAdvisoryXactLock } from '../../shared/job-lock'
import { notifyBookingEvent } from '../notifications/booking-events'
import { bookingExpiredEmailText, bookingExpiredSubject } from './emails/booking-expired-email'
import { bookingsExpiredCounter } from '../../shared/metrics.js'

const BOOKING_EXPIRY_LOCK_ID = 1_234_567_890

export function createBookingExpiryJob(app: FastifyInstance) {
  return {
    // A cada 5 min: o PIX vence em BOOKING_EXPIRY_MINUTES (~30); de hora em hora a vaga
    // ficava presa até ~90 min depois do PIX morrer
    cronTime: '*/5 * * * *',
    onTick: async () => {
      // Advisory lock de transação — evita corrida entre instâncias (D-10)
      const ran = await withAdvisoryXactLock(BOOKING_EXPIRY_LOCK_ID, () => expirePending(app))
      if (!ran) {
        app.log.info('[cron:expiry] Lock not obtained — another instance running, skipping')
      }
    },
    start: true,
  }
}

async function expirePending(app: FastifyInstance): Promise<void> {
  // Find all PENDING bookings where expiresAt <= NOW() (D-07)
  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lte: new Date() },
    },
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      pax: true,
      slotId: true,
      tenantId: true,
      slot: {
        select: {
          package: {
            select: {
              name: true,
              tenant: { select: { slug: true } },
            },
          },
        },
      },
    },
  })

  app.log.info(`[cron:expiry] Found ${expiredBookings.length} booking(s) to expire`)

  for (const booking of expiredBookings) {
    try {
      // Atomically expire booking and release slot seats (D-11)
      const expired = await prisma.$transaction(async (tx) => {
        const updated = await tx.booking.updateMany({
          where: { id: booking.id, status: 'PENDING' },
          data: { status: 'EXPIRED' },
        })
        // Já CONFIRMED/CANCELLED por webhook ou cliente — nada a fazer
        if (updated.count === 0) return false

        const [currentSlot] = await tx.$queryRaw<
          Array<{ id: string; booked: number; capacity: number; status: string }>
        >`
          SELECT id, booked, capacity, status
          FROM "DepartureSlot"
          WHERE id = ${booking.slotId}
          FOR UPDATE
        `
        if (!currentSlot) return true // slot deleted — skip status update

        // Valor travado pelo FOR UPDATE, nunca negativo
        const newBooked = Math.max(0, currentSlot.booked - booking.pax)
        await tx.departureSlot.update({
          where: { id: booking.slotId },
          data: {
            booked: newBooked,
            ...(currentSlot.status !== 'CANCELLED' && currentSlot.status !== 'COMPLETED'
              ? { status: newBooked < currentSlot.capacity ? 'OPEN' : 'FULL' }
              : {}),
          },
        })
        return true
      })

      // Só avisa quem de fato expirou — nunca uma reserva que acabou de ser paga
      if (!expired) continue

      app.log.info(`[cron:expiry] Expired booking ${booking.id}`)
      bookingsExpiredCounter.add(1)
      void notifyBookingEvent(app.log, booking.id, 'expired').catch(() => {})

      // Send NOTIF-04 fire-and-forget (D-12): email failure MUST NOT revert expiry
      const resend = getResend()
      if (resend && booking.customerEmail) {
        const packageName = booking.slot?.package?.name ?? 'Passeio'
        const slug = booking.slot?.package?.tenant?.slug ?? ''
        resend.emails
          .send({
            from: getEmailFrom(),
            to: [booking.customerEmail],
            subject: bookingExpiredSubject,
            text: bookingExpiredEmailText({
              bookingId: booking.id,
              customerName: booking.customerName,
              packageName,
              slug,
            }),
          })
          .catch((emailErr: unknown) => {
            app.log.warn(
              { err: emailErr, bookingId: booking.id },
              '[cron:expiry] Failed to send expiry email',
            )
          })
      }
    } catch (bookingErr) {
      // Log and continue — one booking failure must not stop the batch (D-12)
      app.log.error(
        { err: bookingErr, bookingId: booking.id },
        '[cron:expiry] Failed to expire booking',
      )
    }
  }
}
