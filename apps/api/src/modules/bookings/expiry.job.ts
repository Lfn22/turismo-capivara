import { FastifyInstance } from 'fastify'
import { Resend } from 'resend'
import prisma from '../../database'
import { bookingExpiredEmailText, bookingExpiredSubject } from './emails/booking-expired-email'

const BOOKING_EXPIRY_LOCK_ID = 1_234_567_890

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping expiry email delivery')
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

export function createBookingExpiryJob(app: FastifyInstance) {
  return {
    cronTime: '* * * * *',
    onTick: async () => {
      // Acquire PostgreSQL advisory lock to prevent multi-instance races (D-10)
      const [lockResult] = await prisma.$queryRaw<Array<{ pg_try_advisory_lock: boolean }>>`
        SELECT pg_try_advisory_lock(${BOOKING_EXPIRY_LOCK_ID})`

      if (!lockResult.pg_try_advisory_lock) {
        app.log.info('[cron:expiry] Lock not obtained — another instance running, skipping')
        return
      }

      try {
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
                status: true,
                booked: true,
                capacity: true,
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
            await prisma.$transaction(async (tx) => {
              await tx.booking.update({
                where: { id: booking.id },
                data: { status: 'EXPIRED' },
              })

              const [currentSlot] = await tx.$queryRaw<Array<{
                id: string; booked: number; capacity: number; status: string
              }>>`
                SELECT id, booked, capacity, status
                FROM "DepartureSlot"
                WHERE id = ${booking.slotId}
                FOR UPDATE
              `
              if (!currentSlot) return // slot deleted — skip status update

              const newBooked = Math.max(0, currentSlot.booked - booking.pax)
              await tx.departureSlot.update({
                where: { id: booking.slotId },
                data: {
                  booked: { decrement: booking.pax },
                  ...(currentSlot.status !== 'CANCELLED' && currentSlot.status !== 'COMPLETED'
                    ? { status: newBooked < currentSlot.capacity ? 'OPEN' : 'FULL' }
                    : {}),
                },
              })
            })

            app.log.info(`[cron:expiry] Expired booking ${booking.id}`)

            // Send NOTIF-04 fire-and-forget (D-12): email failure MUST NOT revert expiry
            const resend = getResend()
            if (resend && booking.customerEmail) {
              const packageName = booking.slot?.package?.name ?? 'Passeio'
              const slug = booking.slot?.package?.tenant?.slug ?? ''
              resend.emails
                .send({
                  from: 'CAPI <noreply@capi.turismo>',
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
                  app.log.warn({ err: emailErr, bookingId: booking.id }, '[cron:expiry] Failed to send expiry email')
                })
            }
          } catch (bookingErr) {
            // Log and continue — one booking failure must not stop the batch (D-12)
            app.log.error({ err: bookingErr, bookingId: booking.id }, '[cron:expiry] Failed to expire booking')
          }
        }
      } finally {
        // Always release the advisory lock — catch to prevent cron fiber crash on DB disconnect
        try {
          await prisma.$queryRaw`SELECT pg_advisory_unlock(${BOOKING_EXPIRY_LOCK_ID})`
        } catch (unlockErr) {
          app.log.error({ err: unlockErr }, '[cron:expiry] Failed to release advisory lock')
        }
      }
    },
    start: true,
  }
}
