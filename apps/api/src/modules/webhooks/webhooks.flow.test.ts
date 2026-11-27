/**
 * Fluxo do webhook do Mercado Pago:
 *  - dedupe por (paymentId, status), gravado só após processar com sucesso
 *  - pagamento aprovado tardio: reativa (se houver vaga) ou estorna
 *  - cancelled/rejected de cobrança antiga não derruba a reserva repaga
 *  - falha ao consultar o MP → 503 (MP reenvia)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'node:crypto'

const WEBHOOK_SECRET = 'test-webhook-secret'
process.env.MP_WEBHOOK_SECRET = WEBHOOK_SECRET
process.env.MP_ACCESS_TOKEN = 'test-mp-token'

const tx = {
  $queryRaw: vi.fn(),
  booking: { updateMany: vi.fn() },
  departureSlot: { update: vi.fn() },
}

vi.mock('../../database', () => ({
  default: {
    processedWebhookEvent: { findUnique: vi.fn(), create: vi.fn() },
    auditLog: { create: vi.fn(() => Promise.resolve({})) },
    booking: { findFirst: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))
vi.mock('../../shared/email', () => ({ getResend: vi.fn(() => null), getEmailFrom: vi.fn() }))
vi.mock('../../shared/sentry', () => ({
  Sentry: { captureException: vi.fn(), setTag: vi.fn() },
}))
vi.mock('../notifications/booking-events', () => ({
  notifyBookingEvent: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../services/payment.service', () => ({ refundPayment: vi.fn() }))

const paymentGet = vi.fn()
vi.mock('mercadopago', () => ({
  MercadoPagoConfig: class {},
  Payment: class {
    get = paymentGet
  },
}))

import Fastify from 'fastify'
import prisma from '../../database'
import { notifyBookingEvent } from '../notifications/booking-events'
import { refundPayment } from '../../services/payment.service'
import { Sentry } from '../../shared/sentry'
import { webhooksRoutes } from './webhooks.routes'

const db = prisma as any
const PAYMENT_ID = '555'
const FUTURE = new Date(Date.now() + 3 * 24 * 3600_000)

function sign(): Record<string, string> {
  const ts = String(Math.floor(Date.now() / 1000))
  const v1 = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(`id:${PAYMENT_ID};request-id:r1;ts:${ts};`)
    .digest('hex')
  return {
    'content-type': 'application/json',
    'x-signature': `ts=${ts},v1=${v1}`,
    'x-request-id': 'r1',
  }
}

async function post() {
  const app = Fastify({ logger: false })
  await app.register(webhooksRoutes)
  await app.ready()
  const res = await app.inject({
    method: 'POST',
    url: '/webhooks/mercadopago',
    headers: sign(),
    payload: { action: 'payment.updated', data: { id: PAYMENT_ID } },
  })
  await app.close()
  return res
}

function booking(over: Record<string, unknown> = {}) {
  return {
    id: 'b1',
    status: 'PENDING',
    slotId: 's1',
    pax: 2,
    paymentId: PAYMENT_ID,
    customerEmail: null,
    customerName: 'Ana',
    tenant: { slug: 't' },
    slot: null,
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  db.processedWebhookEvent.findUnique.mockResolvedValue(null)
  db.processedWebhookEvent.create.mockResolvedValue({})
  db.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx))
  ;(refundPayment as any).mockResolvedValue(undefined)
})

describe('dedupe por (paymentId, status)', () => {
  it('pending seguido de approved do mesmo pagamento confirma a reserva', async () => {
    db.booking.findFirst.mockResolvedValue(booking())
    db.booking.updateMany.mockResolvedValue({ count: 1 })

    paymentGet.mockResolvedValueOnce({ status: 'pending', external_reference: 'b1' })
    await post()
    paymentGet.mockResolvedValueOnce({ status: 'approved', external_reference: 'b1' })
    const res = await post()

    expect(res.statusCode).toBe(200)
    expect(db.booking.updateMany).toHaveBeenCalledWith({
      where: { id: 'b1', status: 'PENDING' },
      data: { status: 'CONFIRMED', paymentId: PAYMENT_ID },
    })
    expect(db.processedWebhookEvent.create).toHaveBeenCalledWith({ data: { id: '555:pending' } })
    expect(db.processedWebhookEvent.create).toHaveBeenCalledWith({ data: { id: '555:approved' } })
  })

  it('mesmo (paymentId, status) já processado → deduplicated sem tocar na reserva', async () => {
    paymentGet.mockResolvedValue({ status: 'approved', external_reference: 'b1' })
    db.processedWebhookEvent.findUnique.mockResolvedValue({ id: '555:approved' })

    const res = await post()

    expect(res.json()).toEqual({ ok: true, deduplicated: true })
    expect(db.booking.findFirst).not.toHaveBeenCalled()
  })

  it('falha no processamento não marca o evento como processado (MP pode reenviar)', async () => {
    paymentGet.mockResolvedValue({ status: 'approved', external_reference: 'b1' })
    db.booking.findFirst.mockRejectedValue(new Error('db down'))

    const res = await post()

    expect(res.statusCode).toBe(500)
    expect(db.processedWebhookEvent.create).not.toHaveBeenCalled()
  })

  it('MP indisponível → 503 para o MP reenviar', async () => {
    paymentGet.mockRejectedValue(new Error('timeout'))
    const res = await post()
    expect(res.statusCode).toBe(503)
  })
})

describe('pagamento aprovado fora de PENDING', () => {
  beforeEach(() => {
    paymentGet.mockResolvedValue({ status: 'approved', external_reference: 'b1' })
  })

  it('EXPIRED com horário livre → reativa como CONFIRMED e ocupa o horário inteiro, sem estorno', async () => {
    db.booking.findFirst.mockResolvedValue(booking({ status: 'EXPIRED' }))
    tx.$queryRaw.mockResolvedValue([{ status: 'OPEN', booked: 0, maxGuides: 1, startsAt: FUTURE }])
    tx.booking.updateMany.mockResolvedValue({ count: 1 })

    const res = await post()

    expect(res.statusCode).toBe(200)
    expect(tx.booking.updateMany).toHaveBeenCalledWith({
      where: { id: 'b1', status: 'EXPIRED' },
      data: { status: 'CONFIRMED', paymentId: PAYMENT_ID },
    })
    expect(tx.departureSlot.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { booked: 2, status: 'FULL' },
    })
    expect(refundPayment).not.toHaveBeenCalled()
    expect(notifyBookingEvent).toHaveBeenCalledWith(expect.anything(), 'b1', 'confirmed')
  })

  it('EXPIRED sem vaga → estorna e não reativa', async () => {
    db.booking.findFirst.mockResolvedValue(booking({ status: 'EXPIRED' }))
    tx.$queryRaw.mockResolvedValue([{ status: 'FULL', booked: 5, maxGuides: 1, startsAt: FUTURE }])

    await post()

    expect(tx.booking.updateMany).not.toHaveBeenCalled()
    expect(refundPayment).toHaveBeenCalledWith(PAYMENT_ID)
  })

  it('EXPIRED com passeio já iniciado → estorna', async () => {
    db.booking.findFirst.mockResolvedValue(booking({ status: 'EXPIRED' }))
    tx.$queryRaw.mockResolvedValue([
      { status: 'OPEN', booked: 0, maxGuides: 1, startsAt: new Date(Date.now() - 3600_000) },
    ])

    await post()

    expect(refundPayment).toHaveBeenCalledWith(PAYMENT_ID)
  })

  it('A e B expiram; A paga tarde → FULL; B paga tarde → estorna sem confirmar', async () => {
    // estado do horário em memória, compartilhado entre as duas entregas
    const slotRow = { status: 'OPEN', booked: 0, maxGuides: 1, startsAt: FUTURE }
    tx.$queryRaw.mockImplementation(async () => [{ ...slotRow }])
    tx.departureSlot.update.mockImplementation(async ({ data }: any) =>
      Object.assign(slotRow, data),
    )
    tx.booking.updateMany.mockResolvedValue({ count: 1 })
    db.booking.findUnique.mockResolvedValue({ status: 'EXPIRED', paymentId: null })

    db.booking.findFirst.mockResolvedValue(booking({ id: 'A', status: 'EXPIRED', pax: 3 }))
    await post()
    expect(slotRow).toMatchObject({ booked: 3, status: 'FULL' })
    expect(refundPayment).not.toHaveBeenCalled()

    tx.booking.updateMany.mockClear()
    db.booking.findFirst.mockResolvedValue(booking({ id: 'B', status: 'EXPIRED', pax: 2 }))
    db.processedWebhookEvent.findUnique.mockResolvedValue(null)
    await post()
    expect(tx.booking.updateMany).not.toHaveBeenCalled()
    expect(slotRow).toMatchObject({ booked: 3, status: 'FULL' })
    expect(refundPayment).toHaveBeenCalledWith(PAYMENT_ID)
  })

  it('EXPIRED com grupo maior que os guias do horário → estorna', async () => {
    db.booking.findFirst.mockResolvedValue(booking({ status: 'EXPIRED', pax: 9 }))
    tx.$queryRaw.mockResolvedValue([{ status: 'OPEN', booked: 0, maxGuides: 1, startsAt: FUTURE }])

    await post()

    expect(tx.booking.updateMany).not.toHaveBeenCalled()
    expect(refundPayment).toHaveBeenCalledWith(PAYMENT_ID)
  })

  it('CANCELLED pelo cliente → estorna', async () => {
    db.booking.findFirst.mockResolvedValue(booking({ status: 'CANCELLED' }))
    await post()
    expect(refundPayment).toHaveBeenCalledWith(PAYMENT_ID)
  })

  it('CONFIRMED por outro pagamento (pagamento em dobro) → estorna este', async () => {
    db.booking.findFirst.mockResolvedValue(booking({ status: 'CONFIRMED', paymentId: '999' }))
    await post()
    expect(refundPayment).toHaveBeenCalledWith(PAYMENT_ID)
  })

  it('CONFIRMED pelo mesmo pagamento (reentrega) → nada a fazer', async () => {
    db.booking.findFirst.mockResolvedValue(booking({ status: 'CONFIRMED' }))
    await post()
    expect(refundPayment).not.toHaveBeenCalled()
    expect(db.booking.updateMany).not.toHaveBeenCalled()
  })

  it('falha no estorno → alerta no Sentry e 500 para o MP reenviar', async () => {
    db.booking.findFirst.mockResolvedValue(booking({ status: 'CANCELLED' }))
    ;(refundPayment as any).mockRejectedValue(new Error('HTTP 400'))

    const res = await post()

    expect(res.statusCode).toBe(500)
    expect(Sentry.captureException).toHaveBeenCalled()
    expect(db.processedWebhookEvent.create).not.toHaveBeenCalled()
  })
})

describe('cancelled / rejected', () => {
  beforeEach(() => {
    paymentGet.mockResolvedValue({ status: 'cancelled', external_reference: 'b1' })
  })

  it('cobrança antiga (repay trocou o paymentId) não expira a reserva', async () => {
    db.booking.findFirst.mockResolvedValue(booking({ paymentId: '999' }))
    await post()
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('expira só se ainda PENDING e libera a vaga uma única vez', async () => {
    db.booking.findFirst.mockResolvedValue(booking())
    tx.booking.updateMany.mockResolvedValue({ count: 1 })
    tx.$queryRaw.mockResolvedValue([{ status: 'FULL', booked: 5, capacity: 5 }])

    await post()

    expect(tx.booking.updateMany).toHaveBeenCalledWith({
      where: { id: 'b1', status: 'PENDING' },
      data: { status: 'EXPIRED' },
    })
    expect(tx.departureSlot.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { booked: 3, status: 'OPEN' },
    })
    expect(notifyBookingEvent).toHaveBeenCalledWith(expect.anything(), 'b1', 'expired')
  })

  it('corrida com o job de expiração (count 0) → não libera a vaga de novo', async () => {
    db.booking.findFirst.mockResolvedValue(booking())
    tx.booking.updateMany.mockResolvedValue({ count: 0 })

    await post()

    expect(tx.departureSlot.update).not.toHaveBeenCalled()
    expect(notifyBookingEvent).not.toHaveBeenCalled()
  })
})
