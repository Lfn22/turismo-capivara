/**
 * webhooks.signature.test.ts
 *
 * Regressão para V-1: o manifesto da assinatura do webhook Mercado Pago.
 *
 * Este teste existe porque a falha é SILENCIOSA. Um manifesto errado faz toda
 * notificação ser rejeitada, mas a rota ainda responde 200 — o MP para de
 * retentar e nenhuma reserva paga chega a CONFIRMED, sem erro visível.
 *
 * O formato correto, por documentação do MP, é:
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'node:crypto'

const WEBHOOK_SECRET = 'test-webhook-secret'
process.env.MP_WEBHOOK_SECRET = WEBHOOK_SECRET
process.env.MP_ACCESS_TOKEN = 'test-mp-token'

vi.mock('../../database', () => ({
  default: {
    processedWebhookEvent: { create: vi.fn() },
    booking: { findFirst: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('../../shared/email', () => ({
  getResend: vi.fn(() => null),
  getEmailFrom: vi.fn(() => 'test@example.com'),
}))

vi.mock('../../shared/sentry', () => ({
  Sentry: { captureException: vi.fn(), withScope: vi.fn(), setupFastifyErrorHandler: vi.fn() },
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
import { webhooksRoutes } from './webhooks.routes'

const db = prisma as unknown as {
  processedWebhookEvent: { create: ReturnType<typeof vi.fn> }
  booking: { findFirst: ReturnType<typeof vi.fn> }
}

const PAYMENT_ID = '1234567890'
const REQUEST_ID = 'req-abc-123'

/** Assina exatamente como o Mercado Pago assina, com o manifesto documentado. */
function signLikeMercadoPago(paymentId: string, requestId: string, ts: string): string {
  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`
  const v1 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(manifest).digest('hex')
  return `ts=${ts},v1=${v1}`
}

async function buildWebhookApp() {
  const app = Fastify({ logger: false })
  // rawBody não é necessário: a rota lê request.body, e o parser JSON padrão basta aqui
  await app.register(webhooksRoutes)
  await app.ready()
  return app
}

async function postWebhook(signature: string, requestId: string | undefined) {
  const app = await buildWebhookApp()
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-signature': signature,
  }
  if (requestId) headers['x-request-id'] = requestId

  const res = await app.inject({
    method: 'POST',
    url: '/webhooks/mercadopago',
    headers,
    payload: { action: 'payment.updated', data: { id: PAYMENT_ID } },
  })
  await app.close()
  return res
}

describe('V-1: manifesto da assinatura do webhook Mercado Pago', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Se a assinatura for aceita, o fluxo segue e registra o evento de dedupe.
    // Usamos isso como sinal observável de "assinatura validada com sucesso".
    db.processedWebhookEvent.create.mockResolvedValue({ id: PAYMENT_ID })
    db.booking.findFirst.mockResolvedValue(null)
    paymentGet.mockResolvedValue({ status: 'approved', external_reference: 'booking-1' })
  })

  it('aceita uma assinatura gerada com o manifesto documentado do MP', async () => {
    const ts = String(Math.floor(Date.now() / 1000))
    const res = await postWebhook(signLikeMercadoPago(PAYMENT_ID, REQUEST_ID, ts), REQUEST_ID)

    expect(res.statusCode).toBe(200)
    // Prova de que passou da validação: o dedupe só roda depois da assinatura ser aceita
    expect(db.processedWebhookEvent.create).toHaveBeenCalledWith({ data: { id: PAYMENT_ID } })
  })

  it('rejeita o manifesto antigo "request-date" (o bug corrigido em V-1)', async () => {
    const ts = String(Math.floor(Date.now() / 1000))
    const legacyManifest = `id:${PAYMENT_ID};request-date:${ts};`
    const v1 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(legacyManifest).digest('hex')

    const res = await postWebhook(`ts=${ts},v1=${v1}`, REQUEST_ID)

    expect(res.statusCode).toBe(200) // sempre 200, por design anti-enumeração
    expect(db.processedWebhookEvent.create).not.toHaveBeenCalled()
  })

  it('rejeita assinatura forjada com segredo errado', async () => {
    const ts = String(Math.floor(Date.now() / 1000))
    const manifest = `id:${PAYMENT_ID};request-id:${REQUEST_ID};ts:${ts};`
    const v1 = crypto.createHmac('sha256', 'segredo-errado').update(manifest).digest('hex')

    const res = await postWebhook(`ts=${ts},v1=${v1}`, REQUEST_ID)

    expect(res.statusCode).toBe(200)
    expect(db.processedWebhookEvent.create).not.toHaveBeenCalled()
  })

  it('omite request-id do manifesto quando o header não vem na notificação', async () => {
    const ts = String(Math.floor(Date.now() / 1000))
    const manifest = `id:${PAYMENT_ID};ts:${ts};`
    const v1 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(manifest).digest('hex')

    const res = await postWebhook(`ts=${ts},v1=${v1}`, undefined)

    expect(res.statusCode).toBe(200)
    expect(db.processedWebhookEvent.create).toHaveBeenCalled()
  })

  it('rejeita timestamp fora da janela de 5 minutos (replay)', async () => {
    const staleTs = String(Math.floor(Date.now() / 1000) - 600)
    const res = await postWebhook(signLikeMercadoPago(PAYMENT_ID, REQUEST_ID, staleTs), REQUEST_ID)

    expect(res.statusCode).toBe(200)
    expect(db.processedWebhookEvent.create).not.toHaveBeenCalled()
  })
})
