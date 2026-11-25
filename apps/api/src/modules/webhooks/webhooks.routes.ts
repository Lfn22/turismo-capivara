import { FastifyInstance } from 'fastify'
import crypto from 'node:crypto'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import prisma from '../../database'
import { Sentry } from '../../shared/sentry'
import { getResend, getEmailFrom } from '../../shared/email'
import { notifyBookingEvent } from '../notifications/booking-events'
import {
  bookingConfirmedEmailText,
  bookingConfirmedSubject,
} from '../bookings/emails/booking-confirmed-email'
import { auditLog } from '../../shared/audit.js'
import { bookingsConfirmedCounter } from '../../shared/metrics.js'
import { refundPayment } from '../../services/payment.service'
import { z } from 'zod'

const webhookBodySchema = z.object({
  action: z.string().optional(),
  data: z.object({ id: z.string() }).optional(),
})

function validateMpSignature(
  signatureHeader: string,
  paymentId: string,
  requestId: string | undefined,
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

  // Manifest template per MP docs: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
  // - data.id is lowercased when it contains uppercase alphanumerics
  // - a component whose value is absent from the notification is omitted entirely
  const manifest =
    `id:${paymentId.toLowerCase()};` + (requestId ? `request-id:${requestId};` : '') + `ts:${ts};`

  const computed = crypto
    .createHmac('sha256', process.env.MP_WEBHOOK_SECRET!)
    .update(manifest)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(v1, 'hex'))
  } catch {
    // Buffers of different lengths — invalid signature
    return false
  }
}

type WebhookBooking = {
  id: string
  status: string
  slotId: string
  pax: number
  paymentId: string | null
  customerName: string
  customerEmail: string | null
  tenant?: { slug: string } | null
  slot?: {
    startsAt: Date
    package?: { name: string; conductor?: { name: string } | null } | null
  } | null
}

async function markProcessed(dedupeKey: string): Promise<void> {
  try {
    await prisma.processedWebhookEvent.create({ data: { id: dedupeKey } })
  } catch (err: unknown) {
    // Entrega concorrente já registrou — ok
    if ((err as { code?: string } | null)?.code !== 'P2002') throw err
  }
}

/** Estorno com alerta: falha aqui é dinheiro do cliente retido. Relança para o MP reenviar. */
async function refundWithAlert(
  app: FastifyInstance,
  bookingId: string,
  paymentId: string,
  reason: string,
): Promise<void> {
  try {
    await refundPayment(paymentId)
  } catch (err) {
    app.log.error({ err, bookingId, paymentId, reason }, '[webhook] Estorno falhou')
    Sentry.captureException(err, { tags: { module: 'webhooks', action: 'refund' } })
    throw err
  }
  app.log.warn({ bookingId, paymentId, reason }, '[webhook] Pagamento estornado')
  auditLog(prisma, {
    actorType: 'SYSTEM',
    action: 'booking.payment-refunded',
    targetType: 'BOOKING',
    targetId: bookingId,
    metadata: { paymentId, reason },
  })
}

function onConfirmed(app: FastifyInstance, booking: WebhookBooking, paymentId: string) {
  void notifyBookingEvent(app.log, booking.id, 'confirmed').catch(() => {})
  bookingsConfirmedCounter.add(1, { tenant: booking.tenant?.slug ?? 'unknown' })

  auditLog(prisma, {
    actorType: 'SYSTEM',
    action: 'booking.confirmed',
    targetType: 'BOOKING',
    targetId: booking.id,
    metadata: { paymentId },
  })

  // NOTIF-02: Notify customer of confirmed booking (fire-and-forget, D-12)
  const resend = getResend()
  if (resend && booking.customerEmail) {
    resend.emails
      .send({
        from: getEmailFrom(),
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
        app.log.warn(
          { err: emailErr, bookingId: booking.id },
          '[email] Failed to send booking-confirmed email',
        )
      })
  }
}

/**
 * Reserva EXPIRED paga tarde: reocupa a vaga se o slot ainda estiver aberto, com
 * capacidade e no futuro. Retorna false se não couber (o chamador estorna).
 */
async function reactivateExpired(booking: WebhookBooking, paymentId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const [slot] = await tx.$queryRaw<
      Array<{ status: string; booked: number; capacity: number; startsAt: Date }>
    >`
      SELECT status, booked, capacity, "startsAt" FROM "DepartureSlot"
      WHERE id = ${booking.slotId}
      FOR UPDATE
    `
    if (
      !slot ||
      slot.status !== 'OPEN' ||
      slot.booked + booking.pax > slot.capacity ||
      new Date(slot.startsAt).getTime() <= Date.now()
    ) {
      return false
    }
    const res = await tx.booking.updateMany({
      where: { id: booking.id, status: 'EXPIRED' },
      data: { status: 'CONFIRMED', paymentId },
    })
    if (res.count === 0) return false
    const newBooked = slot.booked + booking.pax
    await tx.departureSlot.update({
      where: { id: booking.slotId },
      data: { booked: newBooked, status: newBooked >= slot.capacity ? 'FULL' : 'OPEN' },
    })
    return true
  })
}

async function handleApproved(
  app: FastifyInstance,
  booking: WebhookBooking,
  paymentId: string,
  retried = false,
): Promise<void> {
  switch (booking.status) {
    case 'PENDING': {
      // PENDING → CONFIRMED (idempotente: só transiciona se ainda PENDING)
      const res = await prisma.booking.updateMany({
        where: { id: booking.id, status: 'PENDING' },
        data: { status: 'CONFIRMED', paymentId },
      })
      if (res.count > 0) return onConfirmed(app, booking, paymentId)
      break // corrida (ex.: job de expiração) — reavalia com o estado atual
    }
    case 'EXPIRED': {
      // Pago depois de expirar: reativa se houver vaga, senão estorna
      if (await reactivateExpired(booking, paymentId)) {
        return onConfirmed(app, booking, paymentId)
      }
      const fresh = await prisma.booking.findUnique({
        where: { id: booking.id },
        select: { status: true, paymentId: true },
      })
      if (fresh?.status === 'CONFIRMED' && fresh.paymentId === paymentId) return // outra entrega reativou
      return refundWithAlert(app, booking.id, paymentId, 'pago-apos-expirar-sem-vaga')
    }
    case 'CANCELLED':
      // O cliente desistiu — o dinheiro volta
      return refundWithAlert(app, booking.id, paymentId, 'pago-apos-cancelamento')
    case 'CONFIRMED':
    case 'CHECKED_IN':
    case 'COMPLETED':
      // Reentrega do mesmo pagamento → nada. Outro pagamento aprovado → pagamento em dobro.
      if (booking.paymentId && booking.paymentId !== paymentId) {
        return refundWithAlert(app, booking.id, paymentId, 'pagamento-em-dobro')
      }
      return
    default:
      return // NO_SHOW etc.
  }

  if (retried) return
  const fresh = await prisma.booking.findUnique({
    where: { id: booking.id },
    select: { status: true, paymentId: true },
  })
  if (fresh) await handleApproved(app, { ...booking, ...fresh }, paymentId, true)
}

async function handleFailedPayment(
  app: FastifyInstance,
  booking: WebhookBooking,
  paymentId: string,
): Promise<void> {
  if (booking.status !== 'PENDING') return
  // Cobrança antiga (o repay gerou outra): não pode derrubar a reserva com o PIX novo
  if (booking.paymentId && booking.paymentId !== paymentId) return

  // PENDING → EXPIRED + liberação da vaga, só se a transição de fato ocorreu (D-04)
  const released = await prisma.$transaction(async (tx) => {
    const res = await tx.booking.updateMany({
      where: { id: booking.id, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    })
    if (res.count === 0) return false

    const [slot] = await tx.$queryRaw<Array<{ status: string; booked: number; capacity: number }>>`
      SELECT status, booked, capacity FROM "DepartureSlot"
      WHERE id = ${booking.slotId}
      FOR UPDATE
    `
    if (slot) {
      const newBooked = Math.max(0, slot.booked - booking.pax)
      const keepStatus = slot.status === 'CANCELLED' || slot.status === 'COMPLETED'
      await tx.departureSlot.update({
        where: { id: booking.slotId },
        data: {
          booked: newBooked,
          ...(keepStatus ? {} : { status: newBooked < slot.capacity ? 'OPEN' : 'FULL' }),
        },
      })
    }
    return true
  })

  if (released) void notifyBookingEvent(app.log, booking.id, 'expired').catch(() => {})
}

export async function webhooksRoutes(app: FastifyInstance) {
  app.post(
    '/webhooks/mercadopago',
    {
      config: { rawBody: true, rateLimit: false }, // rawBody: fastify-raw-body; rateLimit: exempt webhook from global limit
    },
    async (request, reply) => {
      Sentry.setTag('module', 'webhooks')
      Sentry.setTag('action', 'payment-notification')

      // 1. Validate x-signature header present.
      // Return 400 so Mercado Pago retries (up to 72h) instead of treating as delivered.
      const signatureHeader = request.headers['x-signature']
      if (!signatureHeader || typeof signatureHeader !== 'string') {
        app.log.warn('Webhook recebido sem cabeçalho x-signature')
        return reply.status(400).send({ message: 'Cabeçalho x-signature ausente' })
      }

      // 2. Parse body for data.id (payment ID)
      const parsed = webhookBodySchema.safeParse(request.body)
      const paymentId = parsed.success ? parsed.data.data?.id : undefined

      if (!paymentId) {
        return reply.status(400).send({ message: 'ID do pagamento ausente' })
      }

      // 3. Validate HMAC-SHA256 signature using manifest: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
      const requestIdHeader = request.headers['x-request-id']
      const requestId = typeof requestIdHeader === 'string' ? requestIdHeader : undefined
      const isValid = validateMpSignature(signatureHeader, paymentId, requestId)

      if (!isValid) {
        // Escalated from warn to error + Sentry: a systematically wrong manifest rejects
        // EVERY webhook while still answering 200, so MP stops retrying and paid bookings
        // silently never reach CONFIRMED. This must be visible, not buried in logs.
        app.log.error(
          { sig: signatureHeader.slice(0, 40), paymentId, hasRequestId: Boolean(requestId) },
          'Assinatura de webhook inválida',
        )
        Sentry.captureException(new Error('Mercado Pago webhook signature validation failed'))
        return reply.status(500).send({ message: 'Assinatura do webhook inválida' })
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
        // MP indisponível — 503 para o MP reenviar; responder 200 perderia um "approved"
        app.log.error({ err, paymentId }, 'Falha ao buscar pagamento no Mercado Pago')
        return reply.status(503).send({ message: 'Mercado Pago indisponível' })
      }

      const externalReference = payment.external_reference
      const status = payment.status ?? 'unknown'

      if (!externalReference) {
        // No external_reference — not a booking payment, ignore
        return reply.status(200).send({ message: 'ok' })
      }

      // 5. Dedupe por (paymentId, status): o MP envia várias notificações para o mesmo
      //    pagamento (created → updated), então deduplicar só por paymentId descartaria o
      //    "approved" que chega depois do "pending". O evento só é marcado como processado
      //    depois do sucesso — uma falha no meio deixa o MP reenviar. Entregas concorrentes
      //    são seguras porque toda transição é condicional (updateMany where status).
      const dedupeKey = `${paymentId}:${status}`
      const alreadyProcessed = await prisma.processedWebhookEvent.findUnique({
        where: { id: dedupeKey },
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
          tenant: { select: { slug: true } },
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

      // 7. Transição pelo status autoritativo do MP (booking inexistente → 200, MP
      //    reenviaria um 404 indefinidamente)
      if (booking) {
        if (status === 'approved') {
          await handleApproved(app, booking, paymentId)
        } else if (status === 'cancelled' || status === 'rejected') {
          await handleFailedPayment(app, booking, paymentId)
        }
        // Other statuses (pending, in_process) — no-op
      }

      await markProcessed(dedupeKey)
      return reply.status(200).send({ message: 'ok' })
    },
  )
}
