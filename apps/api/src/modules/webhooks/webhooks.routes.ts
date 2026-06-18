import { FastifyInstance } from 'fastify'
import crypto from 'node:crypto'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import prisma from '../../database'
import { getResend } from '../../shared/email'
import { bookingConfirmedEmailText, bookingConfirmedSubject } from '../bookings/emails/booking-confirmed-email'


function validateMpSignature(
  signatureHeader: string,
  paymentId: string
): boolean {
  // Parse "ts=<timestamp>,v1=<hash>" from x-signature header
  const parts: Record<string, string> = {}
  for (const part of signatureHeader.split(',')) {
    const eqIdx = part.indexOf('=')
    if (eqIdx === -1) continue
    const key = part.slice(0, eqIdx).trim()
    const value = part.slice(eqIdx + 1).trim()
    if (key && value) parts[key] = value
  }

  const ts = parts['ts']
  const v1 = parts['v1']

  if (!ts || !v1) return false

  const tsAge = Math.abs(Date.now() / 1000 - Number(ts))
  if (tsAge > 300) return false

  // Manifest format per MP 2024+ docs: "id:<paymentId>;request-date:<ts>;"
  const manifest = `id:${paymentId};request-date:${ts};`

  const computed = crypto
    .createHmac('sha256', process.env.MP_WEBHOOK_SECRET!)
    .update(manifest)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(v1, 'hex')
    )
  } catch {
    // Buffers of different lengths — invalid signature
    return false
  }
}

export async function webhooksRoutes(app: FastifyInstance) {
  app.post(
    '/webhooks/mercadopago',
    {
      config: { rawBody: true, rateLimit: false }, // rawBody: fastify-raw-body; rateLimit: exempt webhook from global limit
    },
    async (request, reply) => {
      // 1. Validate x-signature header present.
      // Return 200 (not 400) regardless of why validation fails — a 400 here
      // would leak that the endpoint inspects headers, enabling enumeration.
      const signatureHeader = request.headers['x-signature']
      if (!signatureHeader || typeof signatureHeader !== 'string') {
        app.log.warn('Webhook recebido sem cabeçalho x-signature')
        return reply.status(200).send({ message: 'ok' })
      }

      // 2. Parse body for data.id (payment ID)
      const body = request.body as { action?: string; data?: { id?: string } }
      const paymentId = body?.data?.id

      if (!paymentId) {
        return reply.status(200).send({ message: 'ok' })
      }

      // 3. Validate HMAC-SHA256 signature using manifest: "id:<paymentId>;request-date:<ts>;"
      const isValid = validateMpSignature(signatureHeader, paymentId)

      if (!isValid) {
        app.log.warn({ sig: signatureHeader.slice(0, 40) }, 'Assinatura de webhook inválida')
        return reply.status(200).send({ message: 'ok' })
      }

      // 4. Fetch payment details from MP to get authoritative status and external_reference
      // Lazy init — validateEnv() já garantiu que a var existe no startup
      const client = new MercadoPagoConfig({
        accessToken: process.env.MP_ACCESS_TOKEN!,
      })
      let payment
      try {
        payment = await new Payment(client).get({ id: paymentId })
      } catch (err) {
        // MP unreachable — return 200 to prevent MP retry flood
        app.log.error({ err, paymentId }, 'Falha ao buscar pagamento no Mercado Pago')
        return reply.status(200).send({ message: 'ok' })
      }

      const externalReference = payment.external_reference
      const status = payment.status

      if (!externalReference) {
        // No external_reference — not a booking payment, ignore
        return reply.status(200).send({ message: 'ok' })
      }

      // 5. Deduplication check (per D-08/D-09): if this paymentId was already processed,
      //    return 200 immediately without reprocessing. Cleanup of stale records deferred to OPS phase.
      const alreadyProcessed = await prisma.processedWebhookEvent.findUnique({
        where: { id: paymentId },
      })
      if (alreadyProcessed) {
        return reply.status(200).send({ ok: true, deduplicated: true })
      }

      // 6. Find booking by external_reference (= booking.id set at creation)
      //    Using external_reference avoids race condition where webhook fires before
      //    paymentId is stored in booking (per D-03 / prior wave design)
      const booking = await prisma.booking.findFirst({
        where: { id: externalReference },
        include: {
          slot: {
            include: {
              package: {
                select: {
                  name: true,
                  conductor: { select: { name: true } },
                },
              },
            },
          },
        },
      })

      if (!booking) {
        // Unknown booking — return 200 (MP retries 404 indefinitely)
        return reply.status(200).send({ message: 'ok' })
      }

      // 7. Idempotency check (per D-08): already in terminal state — no reprocessing
      const TERMINAL_STATES: string[] = ['CONFIRMED', 'CANCELLED', 'EXPIRED', 'COMPLETED', 'NO_SHOW']
      if (TERMINAL_STATES.includes(booking.status)) {
        return reply.status(200).send({ message: 'ok' })
      }

      // 8. Transition based on authoritative payment status from MP API
      if (status === 'approved') {
        // PENDING → CONFIRMED (idempotent: only transitions if still PENDING)
        await prisma.booking.updateMany({
          where: { id: booking.id, status: 'PENDING' },
          data: { status: 'CONFIRMED' },
        })

        // NOTIF-02: Notify customer of confirmed booking (fire-and-forget, D-12)
        const resend = getResend()
        if (resend && booking.customerEmail) {
          resend.emails
            .send({
              from: 'CAPI <noreply@capi.turismo>',
              to: [booking.customerEmail],
              subject: bookingConfirmedSubject,
              text: bookingConfirmedEmailText({
                bookingId: booking.id,
                customerName: booking.customerName,
                packageName: booking.slot?.package?.name ?? 'Passeio',
                guideName: booking.slot?.package?.conductor?.name ?? 'Guia',
                startsAt: booking.slot?.startsAt ?? new Date(),
                meetingPoint: null,
              }),
            })
            .catch((emailErr: unknown) => {
              app.log.warn({ err: emailErr, bookingId: booking.id }, '[email] Failed to send booking-confirmed email')
            })
        }
      } else if (status === 'cancelled' || status === 'rejected') {
        // PENDING → EXPIRED + release slot inside $transaction (per D-04)
        await prisma.$transaction(async (tx) => {
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: 'EXPIRED' },
          })

          const currentSlot = await tx.departureSlot.findUnique({ where: { id: booking.slotId } })
          const newBooked = Math.max(0, (currentSlot?.booked ?? booking.pax) - booking.pax)
          await tx.departureSlot.update({
            where: { id: booking.slotId },
            data: {
              booked: { decrement: booking.pax },
              // Only recalculate status for OPEN/FULL slots — preserve CANCELLED/COMPLETED
              ...(currentSlot?.status !== 'CANCELLED' && currentSlot?.status !== 'COMPLETED'
                ? { status: newBooked < (currentSlot?.capacity ?? 1) ? 'OPEN' : 'FULL' }
                : {}),
            },
          })
        })
      }
      // Other statuses (pending, in_process) — no-op, acknowledge with 200

      // 9. Register processed event to prevent duplicate processing (per D-08/D-09)
      await prisma.processedWebhookEvent.create({
        data: { id: paymentId },
      })

      return reply.status(200).send({ message: 'ok' })
    }
  )
}
