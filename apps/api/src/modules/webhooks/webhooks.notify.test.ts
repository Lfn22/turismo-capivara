/**
 * Garante que o webhook só notifica quando a transição de status realmente ocorreu.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'node:crypto'

const WEBHOOK_SECRET = 'test-webhook-secret'
process.env.MP_WEBHOOK_SECRET = WEBHOOK_SECRET
process.env.MP_ACCESS_TOKEN = 'test-mp-token'

const tx = {
  booking: { update: vi.fn() },
  departureSlot: { findUnique: vi.fn(), updateMany: vi.fn() },
}

vi.mock('../../database', () => ({
  default: {
    processedWebhookEvent: { create: vi.fn() },
    booking: { findFirst: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  },
}))

vi.mock('../../shared/email', () => ({
  getResend: vi.fn(() => null),
  getEmailFrom: vi.fn(() => 'test@example.com'),
}))

vi.mock('../../shared/sentry', () => ({
  Sentry: { captureException: vi.fn(), withScope: vi.fn(), setupFastifyErrorHandler: vi.fn() },
}))

vi.mock('../notifications/booking-events', () => ({
  notifyBookingEvent: vi.fn().mockResolvedValue(undefined),
}))

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
import { webhooksRoutes } from './webhooks.routes'

const db = prisma as any
const PAYMENT_ID = '555'

function sign(): Record<string, string> {
  const ts = String(Math.floor(Date.now() / 1000))
  const v1 = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(`id:${PAYMENT_ID};request-id:r1;ts:${ts};`)
    .digest('hex')
  return { 'content-type': 'application/json', 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': 'r1' }
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

beforeEach(() => {
  vi.clearAllMocks()
  db.processedWebhookEvent.create.mockResolvedValue({ id: PAYMENT_ID })
  db.booking.findFirst.mockResolvedValue({
    id: 'b1', status: 'PENDING', slotId: 's1', pax: 2, customerEmail: null, slot: null,
  })
  tx.departureSlot.findUnique.mockResolvedValue({ booked: 2, capacity: 5, status: 'OPEN' })
})

describe('webhook mercadopago → notificação por transição', () => {
  it('approved com count > 0 notifica confirmed', async () => {
    paymentGet.mockResolvedValue({ status: 'approved', external_reference: 'b1' })
    db.booking.updateMany.mockResolvedValue({ count: 1 })
    const res = await post()
    expect(res.statusCode).toBe(200)
    expect(notifyBookingEvent).toHaveBeenCalledWith(expect.anything(), 'b1', 'confirmed')
  })

  it('approved com count 0 não notifica', async () => {
    paymentGet.mockResolvedValue({ status: 'approved', external_reference: 'b1' })
    db.booking.updateMany.mockResolvedValue({ count: 0 })
    await post()
    expect(notifyBookingEvent).not.toHaveBeenCalled()
  })

  it.each(['cancelled', 'rejected'])('%s notifica expired', async (status) => {
    paymentGet.mockResolvedValue({ status, external_reference: 'b1' })
    await post()
    expect(notifyBookingEvent).toHaveBeenCalledWith(expect.anything(), 'b1', 'expired')
  })
})
