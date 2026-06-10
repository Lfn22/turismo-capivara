import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import rawBody from 'fastify-raw-body'
import jwt from '@fastify/jwt'
import { authRoutes } from '../modules/auth/auth.routes'
import { bookingsRoutes } from '../modules/bookings/bookings.routes'
import { webhooksRoutes } from '../modules/webhooks/webhooks.routes'
import { AppError } from '../shared/errors/AppError'

const TEST_JWT_SECRET = 'test-secret-minimum-32-characters-xx'

/**
 * Build a minimal Fastify app with @fastify/rate-limit active.
 * Uses production thresholds. Tests fire max+1 requests to trigger 429.
 * NOTE: Do NOT use buildApp() helper — rate-limit must be registered here.
 */
async function buildRateLimitApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, trustProxy: true })

  // rawBody required by webhooksRoutes (global: false → only opt-in routes)
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

  // Register routes — they apply per-route config overrides
  await app.register(authRoutes)
  await app.register(bookingsRoutes)
  await app.register(webhooksRoutes)

  app.get('/health', { config: { rateLimit: false } }, async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({ message: err.message })
    }
    reply.status(500).send({ message: 'Erro interno' })
  })

  await app.ready()
  return app
}

describe('Rate Limiting', () => {
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

  it('blocks 101st request to POST /auth/login (max 100/min per IP)', async () => {
    for (let i = 0; i < 100; i++) {
      await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {},
        headers: { 'x-forwarded-for': '10.1.0.1' },
      })
    }
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {},
      headers: { 'x-forwarded-for': '10.1.0.1' },
    })
    expect(res.statusCode).toBe(429)
  })

  it('blocks 101st request to POST /tenants/:slug/auth/register (max 100/min per IP)', async () => {
    for (let i = 0; i < 100; i++) {
      await app.inject({
        method: 'POST',
        url: '/tenants/test-tenant/auth/register',
        payload: {},
        headers: { 'x-forwarded-for': '10.1.0.2' },
      })
    }
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/test-tenant/auth/register',
      payload: {},
      headers: { 'x-forwarded-for': '10.1.0.2' },
    })
    expect(res.statusCode).toBe(429)
  })

  it('blocks 61st request to POST /tenants/:slug/bookings (max 60/min per IP)', async () => {
    for (let i = 0; i < 60; i++) {
      await app.inject({
        method: 'POST',
        url: '/tenants/test-tenant/bookings',
        payload: {},
        headers: { 'x-forwarded-for': '10.1.0.3' },
      })
    }
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/test-tenant/bookings',
      payload: {},
      headers: { 'x-forwarded-for': '10.1.0.3' },
    })
    expect(res.statusCode).toBe(429)
  })

  it('webhook route never returns 429 regardless of volume', async () => {
    const responses: number[] = []
    for (let i = 0; i < 30; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/webhooks/mercadopago',
        payload: {},
        headers: { 'x-forwarded-for': '10.1.0.4' },
      })
      responses.push(res.statusCode)
    }
    expect(responses.every((s) => s !== 429)).toBe(true)
  })

  it('429 response includes Retry-After header', async () => {
    for (let i = 0; i < 100; i++) {
      await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {},
        headers: { 'x-forwarded-for': '10.1.0.5' },
      })
    }
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {},
      headers: { 'x-forwarded-for': '10.1.0.5' },
    })
    expect(res.statusCode).toBe(429)
    expect(res.headers['retry-after']).toBeDefined()
  })

  it('GET /health never rate-limited (30 requests all succeed)', async () => {
    const responses: number[] = []
    for (let i = 0; i < 30; i++) {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { 'x-forwarded-for': '10.1.0.6' },
      })
      responses.push(res.statusCode)
    }
    expect(responses.every((s) => s !== 429)).toBe(true)
  })
})

describe('Self-Service per-email rate limiting (max 5 / 15 min)', () => {
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

  it('blocks 6th POST /tenants/:slug/bookings/lookup for the same email', async () => {
    const payload = { email: 'turista-lookup@example.com', code: 'abc123' }
    // First 5 requests — any status is fine (Prisma not mocked), counter increments
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/tenants/test-tenant/bookings/lookup',
        payload,
        headers: { 'x-forwarded-for': '10.2.0.1' },
      })
    }
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/test-tenant/bookings/lookup',
      payload,
      headers: { 'x-forwarded-for': '10.2.0.1' },
    })
    expect(res.statusCode).toBe(429)
  })

  it('blocks 6th POST /tenants/:slug/bookings/cancel-self for the same email', async () => {
    const payload = { email: 'turista-cancel@example.com', code: 'abc123' }
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/tenants/test-tenant/bookings/cancel-self',
        payload,
        headers: { 'x-forwarded-for': '10.2.0.2' },
      })
    }
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/test-tenant/bookings/cancel-self',
      payload,
      headers: { 'x-forwarded-for': '10.2.0.2' },
    })
    expect(res.statusCode).toBe(429)
  })

  it('blocks 6th POST /tenants/:slug/bookings/repay for the same email', async () => {
    const payload = { email: 'turista-repay@example.com', code: 'abc123' }
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/tenants/test-tenant/bookings/repay',
        payload,
        headers: { 'x-forwarded-for': '10.2.0.3' },
      })
    }
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/test-tenant/bookings/repay',
      payload,
      headers: { 'x-forwarded-for': '10.2.0.3' },
    })
    expect(res.statusCode).toBe(429)
  })

  it('429 response on /lookup includes Retry-After header', async () => {
    const payload = { email: 'turista-retry-after@example.com', code: 'abc123' }
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/tenants/test-tenant/bookings/lookup',
        payload,
        headers: { 'x-forwarded-for': '10.2.0.4' },
      })
    }
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/test-tenant/bookings/lookup',
      payload,
      headers: { 'x-forwarded-for': '10.2.0.4' },
    })
    expect(res.statusCode).toBe(429)
    expect(res.headers['retry-after']).toBeDefined()
  })
})
