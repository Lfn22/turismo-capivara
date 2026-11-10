import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'

vi.mock('../../../database', () => ({
  default: {
    tenant: { findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  },
}))

vi.mock('../../uploads/replaced-photo', () => ({ deleteReplacedPhoto: vi.fn().mockResolvedValue(undefined) }))

import { buildApp } from '../../../__tests__/helpers/build-app'
import { tenantSettingsRoutes } from '../tenant-settings.routes'
import { deleteReplacedPhoto } from '../../uploads/replaced-photo'
import prisma from '../../../database'

const db = prisma as any
const app = buildApp(tenantSettingsRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())

const tenantA = { id: 'tenant-a', slug: 'agencia-a', name: 'Agência A', whatsapp: null, logoUrl: null, type: 'AGENCIA' }

beforeEach(() => {
  vi.clearAllMocks()
  db.auditLog.create.mockResolvedValue({})
  db.tenant.findUnique.mockImplementation(async ({ where }: any) =>
    where.slug === 'agencia-a' || where.id === 'tenant-a' ? tenantA : null,
  )
  db.tenant.update.mockImplementation(async ({ data }: any) => ({ ...tenantA, ...data }))
})

function auth(role: string, tenantId = 'tenant-a') {
  // authenticate revalida o papel da equipe no banco
  db.user.findUnique.mockResolvedValue({ role })
  const t = app.jwt.sign({ sub: 'user-1', role, tenantId, name: 'Teste', approvalStatus: 'APPROVED' })
  return { authorization: `Bearer ${t}` }
}

describe('GET /tenants/:slug/settings', () => {
  it('ADMIN do próprio tenant → 200 com o formato do contrato', async () => {
    const res = await app.inject({ method: 'GET', url: '/tenants/agencia-a/settings', headers: auth('ADMIN') })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual(tenantA)
  })

  it('ADMIN de outro tenant → 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/agencia-a/settings',
      headers: auth('ADMIN', 'tenant-b'),
    })
    expect(res.statusCode).toBe(403)
  })

  it('CONDUTOR do próprio tenant → 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/tenants/agencia-a/settings', headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(403)
  })

  it('PLATFORM_ADMIN (outro tenant) → 200', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/agencia-a/settings',
      headers: auth('PLATFORM_ADMIN', 'tenant-plataforma'),
    })
    expect(res.statusCode).toBe(200)
  })

  it('slug inexistente → 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/tenants/nao-existe/settings', headers: auth('SUPER_ADMIN', 'x') })
    expect(res.statusCode).toBe(404)
  })
})

describe('PATCH /tenants/:slug/settings', () => {
  it('ADMIN do próprio tenant → 200 e só grava os campos enviados (slug não muda)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/tenants/agencia-a/settings',
      headers: auth('ADMIN'),
      payload: { name: ' Nova Agência ', whatsapp: '(86) 99999-0000', slug: 'outro' },
    })
    expect(res.statusCode).toBe(200)
    expect(db.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant-a' },
      data: { name: 'Nova Agência', whatsapp: '(86) 99999-0000' },
      select: expect.any(Object),
    })
    expect(res.json()).toMatchObject({ slug: 'agencia-a', name: 'Nova Agência' })
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'tenant.updated',
        targetType: 'TENANT',
        targetId: 'tenant-a',
        metadata: { actorUserId: 'user-1', fields: 'name,whatsapp' },
      }),
    })
    expect(deleteReplacedPhoto).not.toHaveBeenCalled()
  })

  it('troca de logo → tenta apagar o logo anterior', async () => {
    db.tenant.findUnique.mockResolvedValue({ ...tenantA, logoUrl: 'https://cdn.x/logos/antigo.png' })
    const res = await app.inject({
      method: 'PATCH',
      url: '/tenants/agencia-a/settings',
      headers: auth('ADMIN'),
      payload: { logoUrl: 'https://cdn.x/logos/novo.png' },
    })
    expect(res.statusCode).toBe(200)
    expect(deleteReplacedPhoto).toHaveBeenCalledWith(
      'https://cdn.x/logos/antigo.png',
      'https://cdn.x/logos/novo.png',
      expect.anything(),
    )
  })

  it('logoUrl http → 400', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/tenants/agencia-a/settings',
      headers: auth('ADMIN'),
      payload: { logoUrl: 'http://cdn.x/logos/a.png' },
    })
    expect(res.statusCode).toBe(400)
    expect(db.tenant.update).not.toHaveBeenCalled()
  })

  it('logoUrl fora do host do R2 (com R2_PUBLIC_URL) → 400', async () => {
    vi.stubEnv('R2_PUBLIC_URL', 'pub.r2.dev')
    try {
      const res = await app.inject({
        method: 'PATCH',
        url: '/tenants/agencia-a/settings',
        headers: auth('ADMIN'),
        payload: { logoUrl: 'https://evil.example/logos/a.png' },
      })
      expect(res.statusCode).toBe(400)
      const ok = await app.inject({
        method: 'PATCH',
        url: '/tenants/agencia-a/settings',
        headers: auth('ADMIN'),
        payload: { logoUrl: 'https://pub.r2.dev/logos/a.png' },
      })
      expect(ok.statusCode).toBe(200)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('ADMIN de outro tenant → 403 sem update', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/tenants/agencia-a/settings',
      headers: auth('ADMIN', 'tenant-b'),
      payload: { name: 'Hack' },
    })
    expect(res.statusCode).toBe(403)
    expect(db.tenant.update).not.toHaveBeenCalled()
  })

  it('CONDUTOR → 403 sem update', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/tenants/agencia-a/settings',
      headers: auth('CONDUTOR'),
      payload: { name: 'Hack' },
    })
    expect(res.statusCode).toBe(403)
    expect(db.tenant.update).not.toHaveBeenCalled()
  })

  it('SUPER_ADMIN → 200, limpa logo e WhatsApp com null', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/tenants/agencia-a/settings',
      headers: auth('SUPER_ADMIN', 'tenant-plataforma'),
      payload: { logoUrl: null, whatsapp: null },
    })
    expect(res.statusCode).toBe(200)
    expect(db.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { logoUrl: null, whatsapp: null } }),
    )
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'tenant.updated', metadata: { actorUserId: 'user-1', fields: 'whatsapp,logoUrl' } }),
    })
    expect(deleteReplacedPhoto).toHaveBeenCalledWith(null, null, expect.anything())
  })

  it('WhatsApp inválido → 400', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/tenants/agencia-a/settings',
      headers: auth('ADMIN'),
      payload: { whatsapp: 'abc123' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('logoUrl inválida → 400', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/tenants/agencia-a/settings',
      headers: auth('ADMIN'),
      payload: { logoUrl: 'nao-url' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('PATCH /tenants/:id/admin-settings', () => {
  it('ADMIN → 403', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/tenants/tenant-a/admin-settings',
      headers: auth('ADMIN'),
      payload: { name: 'X Y' },
    })
    expect(res.statusCode).toBe(403)
    expect(db.tenant.update).not.toHaveBeenCalled()
  })

  it('PLATFORM_ADMIN → 200 e auditLog com actorUserId', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/tenants/tenant-a/admin-settings',
      headers: auth('PLATFORM_ADMIN', 'tenant-plataforma'),
      payload: { name: 'Agência Editada', logoUrl: 'https://cdn.x/logos/a.png' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: 'tenant-a', name: 'Agência Editada', logoUrl: 'https://cdn.x/logos/a.png' })
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'tenant.updated',
        targetType: 'TENANT',
        targetId: 'tenant-a',
        metadata: { actorUserId: 'user-1', fields: 'name,logoUrl' },
      }),
    })
    expect(deleteReplacedPhoto).toHaveBeenCalledWith(null, 'https://cdn.x/logos/a.png', expect.anything())
  })

  it('id inexistente → 404', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/tenants/zz/admin-settings',
      headers: auth('SUPER_ADMIN', 'tenant-plataforma'),
      payload: { name: 'X Y' },
    })
    expect(res.statusCode).toBe(404)
  })
})
