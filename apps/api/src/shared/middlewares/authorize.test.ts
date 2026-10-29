import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'

vi.mock('../../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}))

import { buildApp } from '../../__tests__/helpers/build-app'
import { authenticate } from './authenticate'
import { authorize, requireSuperAdmin } from './authorize'
import { isPlatformStaff } from '../auth/roles'
import prisma from '../../database'

const db = prisma as any

const app = buildApp(async (instance) => {
  instance.get('/t/staff', { preHandler: [authenticate, authorize(['SUPER_ADMIN'])] }, async () => ({ ok: true }))
  instance.get('/t/super', { preHandler: [authenticate, requireSuperAdmin] }, async () => ({ ok: true }))
  instance.get('/t/:slug/staff', { preHandler: [authenticate, authorize(['SUPER_ADMIN'])] }, async () => ({ ok: true }))
})

beforeAll(() => app.ready())
afterAll(() => app.close())

function auth(role: string, tenantId = 'tenant-own') {
  const token = app.jwt.sign({ sub: 'user-1', role, tenantId, name: 'Teste', approvalStatus: 'APPROVED' })
  db.user.findUnique.mockResolvedValue({ role })
  return { authorization: `Bearer ${token}` }
}

describe('authorize — equipe da plataforma', () => {
  it('PLATFORM_ADMIN passa em authorize([SUPER_ADMIN])', async () => {
    const res = await app.inject({ method: 'GET', url: '/t/staff', headers: auth('PLATFORM_ADMIN') })
    expect(res.statusCode).toBe(200)
  })

  it('ADMIN é barrado em authorize([SUPER_ADMIN])', async () => {
    const res = await app.inject({ method: 'GET', url: '/t/staff', headers: auth('ADMIN') })
    expect(res.statusCode).toBe(403)
  })

  it('PLATFORM_ADMIN é barrado em requireSuperAdmin', async () => {
    const res = await app.inject({ method: 'GET', url: '/t/super', headers: auth('PLATFORM_ADMIN') })
    expect(res.statusCode).toBe(403)
    expect(res.json()).toEqual({ message: 'Acesso negado' })
  })

  it('SUPER_ADMIN passa em requireSuperAdmin', async () => {
    const res = await app.inject({ method: 'GET', url: '/t/super', headers: auth('SUPER_ADMIN') })
    expect(res.statusCode).toBe(200)
  })

  it('PLATFORM_ADMIN de outra agência não é barrado por tenant em rota com :slug', async () => {
    db.tenant.findUnique.mockResolvedValue({ id: 'tenant-outra', slug: 'operadora-b' })
    const res = await app.inject({ method: 'GET', url: '/t/operadora-b/staff', headers: auth('PLATFORM_ADMIN') })
    expect(res.statusCode).toBe(200)
  })
})

describe('authenticate — token de equipe revalidado no banco', () => {
  it('PLATFORM_ADMIN cujo usuário não existe mais → 401', async () => {
    const headers = auth('PLATFORM_ADMIN')
    db.user.findUnique.mockResolvedValue(null)
    const res = await app.inject({ method: 'GET', url: '/t/staff', headers })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ message: 'Token inválido ou expirado' })
    expect(db.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' }, select: { role: true } })
  })

  it('PLATFORM_ADMIN cuja role no banco mudou → 401', async () => {
    const headers = auth('PLATFORM_ADMIN')
    db.user.findUnique.mockResolvedValue({ role: 'CLIENTE' })
    const res = await app.inject({ method: 'GET', url: '/t/staff', headers })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ message: 'Token inválido ou expirado' })
  })

  it('token não-staff não consulta o usuário no banco', async () => {
    db.user.findUnique.mockClear()
    db.tenant.findUnique.mockResolvedValue({ id: 'tenant-own', slug: 'operadora-a' })
    await app.inject({ method: 'GET', url: '/t/operadora-a/staff', headers: auth('ADMIN') })
    expect(db.user.findUnique).not.toHaveBeenCalled()
  })
})

describe('isPlatformStaff', () => {
  it('reconhece SUPER_ADMIN e PLATFORM_ADMIN', () => {
    expect(isPlatformStaff('SUPER_ADMIN')).toBe(true)
    expect(isPlatformStaff('PLATFORM_ADMIN')).toBe(true)
    expect(isPlatformStaff('ADMIN')).toBe(false)
  })
})
