/**
 * Testes de integração para o webhook do Mercado Pago.
 *
 * Comportamento real: o handler retorna 200 em TODOS os casos (incluindo falhas
 * de validação) para evitar enumeration e retry storms do MP.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Fastify from 'fastify'
import rawBody from 'fastify-raw-body'
import crypto from 'node:crypto'
import { webhooksRoutes } from '../modules/webhooks/webhooks.routes'

// ---------- mocks de dependências externas ----------

vi.mock('../database', () => ({
  default: {
    processedWebhookEvent: { create: vi.fn() },
    booking: { findFirst: vi.fn(), updateMany: vi.fn() },
    departureSlot: { updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

const mockPaymentGet = vi.fn().mockResolvedValue({ status: 'pending', external_reference: 'booking-x' })

vi.mock('mercadopago', () => {
  function MercadoPagoConfig() {}
  function Payment() {
    return { get: mockPaymentGet }
  }
  return { MercadoPagoConfig, Payment }
})

vi.mock('../shared/email', () => ({
  getResend: vi.fn().mockReturnValue({ emails: { send: vi.fn().mockResolvedValue({}) } }),
  getEmailFrom: vi.fn().mockReturnValue('CAPI <noreply@capi.turismo>'),
}))

vi.mock('../shared/audit.js', () => ({ auditLog: vi.fn() }))
vi.mock('../shared/metrics.js', () => ({ bookingsConfirmedCounter: { add: vi.fn() } }))

// ---------- constantes ----------

const WEBHOOK_SECRET = 'test-webhook-secret-for-hmac'

function makeSignature(paymentId: string, ts: string): string {
  const manifest = `id:${paymentId};request-date:${ts};`
  return `ts=${ts},v1=${crypto.createHmac('sha256', WEBHOOK_SECRET).update(manifest).digest('hex')}`
}

function buildTestApp() {
  const app = Fastify({ logger: false })
  app.register(rawBody, { global: false, encoding: 'utf8', runFirst: true })
  app.register(webhooksRoutes)
  return app
}

// ---------- setup ----------

beforeAll(() => {
  process.env.MP_WEBHOOK_SECRET = WEBHOOK_SECRET
  process.env.MP_ACCESS_TOKEN = 'test-mp-token'
})

afterAll(async () => {
  delete process.env.MP_WEBHOOK_SECRET
  delete process.env.MP_ACCESS_TOKEN
})

// ---------- testes ----------

describe('POST /webhooks/mercadopago', () => {
  it('rejeita requisição sem cabeçalho x-signature → 200 com ok', async () => {
    const app = buildTestApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/mercadopago',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'payment', data: { id: 'pay-123' } }),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'ok' })
    await app.close()
  })

  it('rejeita assinatura HMAC inválida → 200 com ok', async () => {
    const app = buildTestApp()
    await app.ready()

    const ts = String(Math.floor(Date.now() / 1000))
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/mercadopago',
      headers: {
        'content-type': 'application/json',
        'x-signature': `ts=${ts},v1=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef`,
      },
      body: JSON.stringify({ action: 'payment', data: { id: 'pay-123' } }),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'ok' })
    await app.close()
  })

  it('rejeita timestamp expirado (>300s) → 200 com ok', async () => {
    const app = buildTestApp()
    await app.ready()

    const oldTs = String(Math.floor(Date.now() / 1000) - 400)
    const paymentId = 'pay-456'
    const sig = makeSignature(paymentId, oldTs)

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/mercadopago',
      headers: {
        'content-type': 'application/json',
        'x-signature': sig,
      },
      body: JSON.stringify({ action: 'payment', data: { id: paymentId } }),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'ok' })
    await app.close()
  })

  it('aceita assinatura HMAC válida com ação não-payment → 200', async () => {
    const app = buildTestApp()
    await app.ready()

    const ts = String(Math.floor(Date.now() / 1000))
    const paymentId = 'pay-789'
    const sig = makeSignature(paymentId, ts)

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/mercadopago',
      headers: {
        'content-type': 'application/json',
        'x-signature': sig,
      },
      body: JSON.stringify({ action: 'subscription_preapproval', data: { id: paymentId } }),
    })

    expect(res.statusCode).toBe(200)
    await app.close()
  })
})
