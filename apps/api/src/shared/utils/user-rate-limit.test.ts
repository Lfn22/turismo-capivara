import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { userRateLimit } from './user-rate-limit'

const app = Fastify({ logger: false })

beforeAll(async () => {
  await app.register(jwt, { secret: 'test-secret-minimum-32-characters-xx' })
  await app.register(rateLimit, { global: true, max: 1000, timeWindow: '1 minute' })
  app.post('/sensivel', { config: userRateLimit('teste', 2) }, async () => ({ ok: true }))
  await app.ready()
})
afterAll(() => app.close())

const tokenFor = (sub: string) => app.jwt.sign({ sub, role: 'CLIENTE', tenantId: 't', name: 'X' })
const hit = (headers: Record<string, string> = {}, remoteAddress = '10.0.0.1') =>
  app.inject({ method: 'POST', url: '/sensivel', headers, remoteAddress })

describe('userRateLimit', () => {
  it('limita por usuário, não por IP', async () => {
    const a = { authorization: `Bearer ${tokenFor('user-a')}` }
    expect((await hit(a, '10.0.0.1')).statusCode).toBe(200)
    expect((await hit(a, '10.0.0.2')).statusCode).toBe(200)
    // mesmo usuário em outro IP continua contando
    expect((await hit(a, '10.0.0.3')).statusCode).toBe(429)
    // outro usuário no mesmo IP não é afetado
    expect((await hit({ authorization: `Bearer ${tokenFor('user-b')}` }, '10.0.0.1')).statusCode).toBe(200)
  })

  it('sem token válido cai para o IP', async () => {
    const bad = { authorization: 'Bearer invalido' }
    expect((await hit(bad, '10.9.9.9')).statusCode).toBe(200)
    expect((await hit({}, '10.9.9.9')).statusCode).toBe(200)
    expect((await hit(bad, '10.9.9.9')).statusCode).toBe(429)
    expect((await hit(bad, '10.9.9.8')).statusCode).toBe(200)
  })
})
