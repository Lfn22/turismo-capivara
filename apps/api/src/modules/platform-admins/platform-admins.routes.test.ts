import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { Prisma } from '@prisma/client'

vi.mock('../../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    user: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
  },
}))

import { buildApp } from '../../__tests__/helpers/build-app'
import { platformAdminsRoutes } from './platform-admins.routes'
import prisma from '../../database'

const db = prisma as any
const app = buildApp(platformAdminsRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => vi.resetAllMocks())

function auth(role: string) {
  const t = app.jwt.sign({ sub: 'user-1', role, tenantId: 'tenant-1', name: 'Teste', approvalStatus: 'APPROVED' })
  db.user.findUnique.mockResolvedValueOnce({ role }) // consumido pelo authenticate
  return { authorization: `Bearer ${t}` }
}

const validBody = { name: 'Novo', email: 'Novo@Capi.com', password: 'senha1234' }

describe('platform-admins — acesso', () => {
  it('PLATFORM_ADMIN recebe 403 em GET, POST e DELETE', async () => {
    expect((await app.inject({ method: 'GET', url: '/platform-admins', headers: auth('PLATFORM_ADMIN') })).statusCode).toBe(403)
    expect((await app.inject({ method: 'POST', url: '/platform-admins', headers: auth('PLATFORM_ADMIN'), payload: validBody })).statusCode).toBe(403)
    expect((await app.inject({ method: 'DELETE', url: '/platform-admins/abc', headers: auth('PLATFORM_ADMIN') })).statusCode).toBe(403)
  })
})

describe('GET /platform-admins', () => {
  it('SUPER_ADMIN lista apenas PLATFORM_ADMIN', async () => {
    db.user.findMany.mockResolvedValue([{ id: 'a', name: 'A', email: 'a@x.com', createdAt: new Date() }])
    const res = await app.inject({ method: 'GET', url: '/platform-admins', headers: auth('SUPER_ADMIN') })
    expect(res.statusCode).toBe(200)
    expect(res.json().admins).toHaveLength(1)
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: 'PLATFORM_ADMIN' }, orderBy: { createdAt: 'asc' } }),
    )
  })
})

describe('POST /platform-admins', () => {
  it('cria admin com e-mail em minúsculas e senha com hash', async () => {
    db.tenant.findUnique.mockResolvedValue({ id: 'plat' })
    db.user.create.mockResolvedValue({ id: 'n', name: 'Novo', email: 'novo@capi.com', createdAt: new Date() })
    const res = await app.inject({ method: 'POST', url: '/platform-admins', headers: auth('SUPER_ADMIN'), payload: validBody })
    expect(res.statusCode).toBe(201)
    const data = db.user.create.mock.calls[0][0].data
    expect(data.email).toBe('novo@capi.com')
    expect(data.role).toBe('PLATFORM_ADMIN')
    expect(data.approvalStatus).toBe('APPROVED')
    expect(data.tenantId).toBe('plat')
    expect(data.password).not.toBe('senha1234')
  })

  it('senha curta → 400 com field password', async () => {
    const res = await app.inject({
      method: 'POST', url: '/platform-admins', headers: auth('SUPER_ADMIN'),
      payload: { ...validBody, password: '1234567' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().errors[0].field).toBe('password')
  })

  it('P2002 → 409', async () => {
    db.tenant.findUnique.mockResolvedValue({ id: 'plat' })
    db.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    )
    const res = await app.inject({ method: 'POST', url: '/platform-admins', headers: auth('SUPER_ADMIN'), payload: validBody })
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('E-mail já cadastrado')
  })
})

describe('DELETE /platform-admins/:id', () => {
  it('usuário SUPER_ADMIN → 404 sem apagar', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u', role: 'SUPER_ADMIN' })
    const res = await app.inject({ method: 'DELETE', url: '/platform-admins/u', headers: auth('SUPER_ADMIN') })
    expect(res.statusCode).toBe(404)
    expect(db.user.delete).not.toHaveBeenCalled()
  })

  it('PLATFORM_ADMIN → 204 e apaga', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u', role: 'PLATFORM_ADMIN' })
    db.user.delete.mockResolvedValue({})
    const res = await app.inject({ method: 'DELETE', url: '/platform-admins/u', headers: auth('SUPER_ADMIN') })
    expect(res.statusCode).toBe(204)
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: 'u' } })
  })
})
