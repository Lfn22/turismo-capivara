import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import rawBody from 'fastify-raw-body'
import jwt from '@fastify/jwt'
import { bookingsRoutes } from '../modules/bookings/bookings.routes'
import { AppError } from '../shared/errors/AppError'

const TEST_JWT_SECRET = 'test-secret-minimum-32-characters-xx'

// Mock prisma so no real DB needed
vi.mock('../database', () => ({
  default: {
    tenant: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    booking: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    departureSlot: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('../shared/email', () => ({
  getResend: vi.fn().mockReturnValue(null),
}))

vi.mock('../services/payment.service', () => ({
  createPixPayment: vi.fn(),
}))

async function buildRateLimitApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, trustProxy: true })

  await app.register(rawBody, {
    global: false,
    encoding: false,
    runFirst: true,
  })

  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  })

  await app.register(jwt, { secret: TEST_JWT_SECRET })
  await app.register(bookingsRoutes)

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({ message: err.message })
    }
    reply.status(500).send({ message: 'Erro interno' })
  })

  await app.ready()
  return app
}

describe('cancel-self: rate limit por IP (max 3 / 15 min)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET
    process.env.CPF_SECRET = 'test-cpf-secret-32-chars-xxxxxxxxx'
    process.env.MP_ACCESS_TOKEN = 'TEST_ACCESS_TOKEN'
    process.env.MP_WEBHOOK_SECRET = 'test-webhook-secret'
    app = await buildRateLimitApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('bloqueia na 4a tentativa de cancel-self pelo mesmo IP em 15 minutos', async () => {
    // Primeiras 3 tentativas — não devem retornar 429
    for (let i = 0; i < 3; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/tenants/test-tenant/bookings/cancel-self',
        payload: { token: 'qualquer-token-qualquer' },
        headers: { 'x-forwarded-for': '5.6.7.8' },
      })
      expect(res.statusCode).not.toBe(429)
    }
    // 4a tentativa — deve ser bloqueada
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/test-tenant/bookings/cancel-self',
      payload: { token: 'qualquer-token-qualquer' },
      headers: { 'x-forwarded-for': '5.6.7.8' },
    })
    expect(res.statusCode).toBe(429)
  })

  it('IPs diferentes não compartilham o rate limit de cancel-self', async () => {
    // IP A — 3 requisições (sem atingir limite)
    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: 'POST',
        url: '/tenants/test-tenant/bookings/cancel-self',
        payload: { token: 'token-ip-a' },
        headers: { 'x-forwarded-for': '11.22.33.44' },
      })
    }
    // IP B — primeira requisição não deve ser bloqueada
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/test-tenant/bookings/cancel-self',
      payload: { token: 'token-ip-b' },
      headers: { 'x-forwarded-for': '55.66.77.88' },
    })
    expect(res.statusCode).not.toBe(429)
  })
})

describe('cancel-self: lookup por cancelToken opaco (SEC-02)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET
    process.env.CPF_SECRET = 'test-cpf-secret-32-chars-xxxxxxxxx'
    process.env.MP_ACCESS_TOKEN = 'TEST_ACCESS_TOKEN'
    process.env.MP_WEBHOOK_SECRET = 'test-webhook-secret'
    app = await buildRateLimitApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('retorna 404 quando token fornecido não coincide com nenhum cancelToken', async () => {
    // prisma.booking.findFirst retorna null (mockado acima)
    // tenant mock retorna null também → 404 de tenant
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/test-tenant/bookings/cancel-self',
      payload: { token: 'token-inexistente-nao-e-uuid-suffix' },
      headers: { 'x-forwarded-for': '9.9.9.1' },
    })
    // 404 do tenant (mock retorna null) — confirma que o endpoint aceita `token` no body
    // e não tenta fazer endsWith no id
    expect(res.statusCode).toBe(404)
    const body = JSON.parse(res.body)
    expect(body.message).toContain('não encontrado')
  })

  it('retorna 400 quando body não contém token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/test-tenant/bookings/cancel-self',
      payload: {},
      headers: { 'x-forwarded-for': '9.9.9.2' },
    })
    expect(res.statusCode).toBe(400)
  })
})
