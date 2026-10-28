import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { hashSync } from 'bcryptjs'

vi.mock('../../database', () => ({
  default: {
    user: { findUnique: vi.fn(), findFirst: vi.fn() },
    tenant: { findUnique: vi.fn() },
  },
}))

vi.mock('../../shared/email', () => ({
  getResend: vi.fn(),
  getEmailFrom: vi.fn(),
}))

import { buildApp } from '../../__tests__/helpers/build-app'
import { authRoutes } from './auth.routes'
import prisma from '../../database'

const db = prisma as any
const app = buildApp(authRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => vi.clearAllMocks())

const USER = {
  id: 'user-1',
  tenantId: 'tenant-1',
  role: 'CLIENTE',
  name: 'Ana',
  approvalStatus: 'APPROVED',
  password: hashSync('senha123', 4),
}

function login(body: Record<string, unknown>) {
  return app.inject({ method: 'POST', url: '/auth/login', payload: body })
}

describe('POST /auth/login (somente e-mail e senha)', () => {
  it('autentica pelo e-mail normalizado e retorna token', async () => {
    db.user.findUnique.mockResolvedValue(USER)
    const res = await login({ email: 'Ana@X.com', password: 'senha123' })
    expect(res.statusCode).toBe(200)
    expect(res.json().token).toEqual(expect.any(String))
    expect(db.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'ana@x.com' } }),
    )
    const claims = app.jwt.decode(res.json().token) as any
    expect(claims).toMatchObject({ sub: 'user-1', tenantId: 'tenant-1', role: 'CLIENTE', name: 'Ana', approvalStatus: 'APPROVED' })
  })

  it('ignora tenantSlug enviado por clientes antigos', async () => {
    db.user.findUnique.mockResolvedValue(USER)
    const res = await login({ email: 'Ana@X.com', password: 'senha123', tenantSlug: 'qualquer' })
    expect(res.statusCode).toBe(200)
    expect(res.json().token).toEqual(expect.any(String))
  })

  it('senha errada retorna 401', async () => {
    db.user.findUnique.mockResolvedValue(USER)
    const res = await login({ email: 'ana@x.com', password: 'errada' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ message: 'Credenciais inválidas' })
  })

  it('e-mail inexistente retorna 401', async () => {
    db.user.findUnique.mockResolvedValue(null)
    const res = await login({ email: 'nao@existe.com', password: 'senha123' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ message: 'Credenciais inválidas' })
  })
})

describe('GET /auth/me', () => {
  it('retorna tenantSlug do tenant do usuário', async () => {
    db.tenant.findUnique.mockResolvedValue({ slug: 'serra-capivara' })
    const token = app.jwt.sign({ sub: 'user-1', tenantId: 'tenant-1', role: 'CLIENTE', name: 'Ana' })
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      id: 'user-1',
      role: 'CLIENTE',
      tenantId: 'tenant-1',
      tenantSlug: 'serra-capivara',
    })
    expect(db.tenant.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'tenant-1' } }),
    )
  })
})
