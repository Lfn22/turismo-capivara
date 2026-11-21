import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'

vi.mock('../../../database', () => {
  const db: any = {
    user: { findUnique: vi.fn(), update: vi.fn() },
  }
  return { default: db }
})

import { buildApp } from '../../../__tests__/helpers/build-app'
import { meRoutes } from '../me.routes'
import prisma from '../../../database'

const db = prisma as any
const app = buildApp(meRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => vi.resetAllMocks())

function auth(role = 'CLIENTE') {
  const t = app.jwt.sign({
    sub: 'user-1',
    role,
    tenantId: 'tenant-a',
    name: 'Turista',
    approvalStatus: 'APPROVED',
  })
  return { authorization: `Bearer ${t}` }
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    name: 'Turista Silva',
    email: 'turista@email.com',
    photoUrl: null,
    cpf: '123.456.789-00',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  }
}

describe('GET /me/profile', () => {
  it('retorna dados do perfil do turista', async () => {
    db.user.findUnique.mockResolvedValue(makeUser())

    const res = await app.inject({ method: 'GET', url: '/me/profile', headers: auth() })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      id: 'user-1',
      name: 'Turista Silva',
      email: 'turista@email.com',
      photoUrl: null,
      cpf: '123.456.789-00',
    })
    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true, name: true, email: true, photoUrl: true, cpf: true, createdAt: true },
    })
  })

  it('sem token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/me/profile' })
    expect(res.statusCode).toBe(401)
  })

  it('CONDUTOR → 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/me/profile', headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(403)
  })
})

describe('PATCH /me/profile', () => {
  it('atualiza nome do turista', async () => {
    db.user.update.mockResolvedValue(makeUser({ name: 'Novo Nome' }))

    const res = await app.inject({
      method: 'PATCH',
      url: '/me/profile',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { name: 'Novo Nome' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ name: 'Novo Nome' })
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { name: 'Novo Nome' },
      select: { id: true, name: true, email: true, photoUrl: true, cpf: true, createdAt: true },
    })
  })

  it('400 com nome vazio', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/me/profile',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { name: '' },
    })

    expect(res.statusCode).toBe(400)
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('sem token → 401', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/me/profile',
      headers: { 'content-type': 'application/json' },
      payload: { name: 'Teste' },
    })
    expect(res.statusCode).toBe(401)
  })
})
