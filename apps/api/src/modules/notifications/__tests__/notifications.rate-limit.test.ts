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

import { notificationsRoutes, notificationsKeyGenerator } from '../notifications.routes'

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
  return app.jwt.sign({ sub, role: 'CLIENTE', tenantId: 't1', name: 'X', approvalStatus: 'APPROVED' })
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

  it('keyGenerator usa o sub do token e cai para o IP', () => {
    const base = { server: app, ip: '1.2.3.4' }
    expect(
      notificationsKeyGenerator({ ...base, headers: { authorization: `Bearer ${tokenFor('u9')}` } } as any),
    ).toBe('notif:user:u9')
    expect(notificationsKeyGenerator({ ...base, headers: {} } as any)).toBe('notif:ip:1.2.3.4')
    expect(
      notificationsKeyGenerator({ ...base, headers: { authorization: 'Bearer lixo' } } as any),
    ).toBe('notif:ip:1.2.3.4')
  })
})
