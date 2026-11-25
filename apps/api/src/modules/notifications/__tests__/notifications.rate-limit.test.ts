import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'

vi.mock('../../../database', () => ({
  default: {
    user: { findUnique: vi.fn().mockResolvedValue({ role: 'CLIENTE' }) },
    notification: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))

import { notificationsRoutes } from '../notifications.routes'

const SECRET = 'test-secret-minimum-32-characters-xx'
let app: FastifyInstance

beforeAll(async () => {
  app = Fastify({ logger: false })
  await app.register(rateLimit, { global: true, max: 1000, timeWindow: '1 minute' })
  await app.register(jwt, { secret: SECRET })
  await app.register(notificationsRoutes)
  await app.ready()
})
afterAll(() => app.close())

function tokenFor(sub: string) {
  return app.jwt.sign({
    sub,
    role: 'CLIENTE',
    tenantId: 't1',
    name: 'X',
    approvalStatus: 'APPROVED',
  })
}

function get(token: string) {
  return app.inject({
    method: 'GET',
    url: '/notifications',
    headers: { authorization: `Bearer ${token}`, 'x-forwarded-for': '9.9.9.9' },
  })
}

describe('rate limit de /notifications por usuário', () => {
  it('limita um usuário sem afetar outro com o mesmo IP', async () => {
    const a = tokenFor('user-a')
    const b = tokenFor('user-b')
    for (let i = 0; i < 60; i++) expect((await get(a)).statusCode).toBe(200)
    expect((await get(a)).statusCode).toBe(429)
    expect((await get(b)).statusCode).toBe(200)
  })

  it('token forjado com o sub da vítima não consome o limite dela', async () => {
    const forger = Fastify({ logger: false })
    await forger.register(jwt, { secret: 'outro-segredo-qualquer-com-32-chars!!' })
    await forger.ready()
    const forged = forger.jwt.sign({ sub: 'victim', role: 'CLIENTE', tenantId: 't1' })
    await forger.close()

    for (let i = 0; i < 61; i++) await get(forged)
    expect((await get(tokenFor('victim'))).statusCode).toBe(200)
  })
})
