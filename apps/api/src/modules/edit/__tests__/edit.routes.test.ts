import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'

vi.mock('../../../database', () => ({
  default: {
    tenant: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    destination: { findUnique: vi.fn(), findMany: vi.fn() },
    tourPackage: { findMany: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  },
}))

import { buildApp } from '../../../__tests__/helpers/build-app'
import { editRoutes } from '../edit.routes'
import prisma from '../../../database'

const db = prisma as any
const app = buildApp(editRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => {
  vi.resetAllMocks()
  db.auditLog.create.mockResolvedValue({})
  db.tenant.findMany.mockResolvedValue([])
})

function auth(role: string, tenantId = 'tenant-a', approvalStatus = 'APPROVED') {
  db.user.findUnique.mockResolvedValue({ role, approvalStatus })
  const t = app.jwt.sign({ sub: 'user-1', role, tenantId, name: 'Teste', approvalStatus })
  return { authorization: `Bearer ${t}` }
}

const linkedTenant = {
  id: 'tenant-a',
  slug: 'agencia-a',
  name: 'Agência A',
  destination: { id: 'dest-1', slug: 'serra', title: 'Serra da Capivara' },
}

describe('GET /edit/scope', () => {
  it('equipe → ALL', async () => {
    const res = await app.inject({ method: 'GET', url: '/edit/scope', headers: auth('SUPER_ADMIN') })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      destinations: 'ALL',
      packages: 'ALL',
      canManageDestinations: true,
      label: 'Você pode editar: todos os destinos e roteiros',
    })
  })

  it('ADMIN ligado a destino', async () => {
    db.tenant.findUnique.mockResolvedValue(linkedTenant)
    const res = await app.inject({ method: 'GET', url: '/edit/scope', headers: auth('ADMIN') })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      destinations: ['serra'],
      packages: { tenantId: 'tenant-a', tenantSlug: 'agencia-a' },
      canManageDestinations: false,
      label: 'Você pode editar: página de Serra da Capivara e roteiros da Agência A',
    })
  })

  it('ADMIN sem destino', async () => {
    db.tenant.findUnique.mockResolvedValue({ ...linkedTenant, destination: null })
    const res = await app.inject({ method: 'GET', url: '/edit/scope', headers: auth('ADMIN') })
    expect(res.json().destinations).toEqual([])
    expect(res.json().label).toBe('Você pode editar: roteiros da Agência A')
  })

  it('CONDUTOR aprovado', async () => {
    const res = await app.inject({ method: 'GET', url: '/edit/scope', headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      destinations: [],
      packages: { conductorId: 'user-1' },
      canManageDestinations: false,
      label: 'Você pode editar: seus roteiros',
    })
  })

  it('CONDUTOR pendente → 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/edit/scope', headers: auth('CONDUTOR', 'tenant-a', 'PENDING') })
    expect(res.statusCode).toBe(403)
    expect(res.json().message).toBe('Disponível após verificação')
  })

  it('CLIENTE → 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/edit/scope', headers: auth('CLIENTE') })
    expect(res.statusCode).toBe(403)
  })

  it('sem token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/edit/scope' })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /edit/destinations', () => {
  it('ADMIN → findMany filtrado pelo destino ligado', async () => {
    db.tenant.findUnique.mockResolvedValue(linkedTenant)
    db.destination.findMany.mockResolvedValue([])
    const res = await app.inject({ method: 'GET', url: '/edit/destinations', headers: auth('ADMIN') })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ destinations: [] })
    expect(db.destination.findMany.mock.calls[0][0].where).toEqual({ id: 'dest-1' })
  })

  it('equipe → todos, sem filtro', async () => {
    db.destination.findMany.mockResolvedValue([{ slug: 'a' }])
    const res = await app.inject({ method: 'GET', url: '/edit/destinations', headers: auth('PLATFORM_ADMIN') })
    expect(res.json().destinations).toHaveLength(1)
    expect(db.destination.findMany.mock.calls[0][0].where).toBeUndefined()
  })

  it('CONDUTOR → []', async () => {
    const res = await app.inject({ method: 'GET', url: '/edit/destinations', headers: auth('CONDUTOR') })
    expect(res.json()).toEqual({ destinations: [] })
    expect(db.destination.findMany).not.toHaveBeenCalled()
  })
})

describe('GET /edit/destinations/:destinationSlug', () => {
  it('equipe vê destino oculto/pendente', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1', slug: 'serra', approvalStatus: 'PENDING', active: false })
    const res = await app.inject({ method: 'GET', url: '/edit/destinations/serra', headers: auth('SUPER_ADMIN') })
    expect(res.statusCode).toBe(200)
    expect(res.json().active).toBe(false)
    expect(db.destination.findUnique.mock.calls[0][0].where).toEqual({ slug: 'serra' })
  })

  it('ADMIN não ligado → 403', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1' })
    db.tenant.findFirst.mockResolvedValue(null)
    const res = await app.inject({ method: 'GET', url: '/edit/destinations/serra', headers: auth('ADMIN') })
    expect(res.statusCode).toBe(403)
  })

  it('inexistente → 404', async () => {
    db.destination.findUnique.mockResolvedValue(null)
    const res = await app.inject({ method: 'GET', url: '/edit/destinations/nada', headers: auth('SUPER_ADMIN') })
    expect(res.statusCode).toBe(404)
  })
})

describe('GET /edit/destinations/:destinationSlug/packages', () => {
  const pkg = (over: Record<string, unknown>) => ({
    id: 'p', name: 'R', description: 'd', price: 100, duration: 4, capacity: 10, difficulty: 'EASY',
    photos: [], highlights: [], active: true, publishedAt: new Date('2026-01-01'),
    tenantId: 'tenant-a', conductorId: null, tenant: { slug: 'agencia-a' }, ...over,
  })

  it('ADMIN da agência A: rascunho de A, sem rascunho de B, publicado de B read-only', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1' })
    db.tenant.findFirst.mockResolvedValue({ id: 'tenant-a' })
    db.tourPackage.findMany.mockResolvedValue([
      pkg({ id: 'a-draft', publishedAt: null }),
      pkg({ id: 'b-draft', publishedAt: null, tenantId: 'tenant-b', tenant: { slug: 'agencia-b' } }),
      pkg({ id: 'b-pub', tenantId: 'tenant-b', tenant: { slug: 'agencia-b' } }),
      pkg({ id: 'b-hidden', active: false, tenantId: 'tenant-b', tenant: { slug: 'agencia-b' } }),
      pkg({ id: 'a-hidden', active: false }),
    ])
    const res = await app.inject({ method: 'GET', url: '/edit/destinations/serra/packages', headers: auth('ADMIN') })
    expect(res.statusCode).toBe(200)
    const list = res.json().packages
    expect(list.map((p: any) => p.id)).toEqual(['a-draft', 'b-pub', 'a-hidden'])
    expect(list[0]).toMatchObject({ editable: true, status: 'DRAFT', tenantSlug: 'agencia-a' })
    expect(list[1]).toMatchObject({ editable: false, status: 'PUBLISHED' })
    expect(list[2]).toMatchObject({ editable: true, status: 'HIDDEN' })
    expect(db.tourPackage.findMany.mock.calls[0][0].where).toEqual({ tenant: { destinationId: 'dest-1' } })
  })

  it('slug que não é de tenant → 200 (sem checagem de tenant)', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1' })
    db.tourPackage.findMany.mockResolvedValue([])
    const res = await app.inject({ method: 'GET', url: '/edit/destinations/serra/packages', headers: auth('SUPER_ADMIN') })
    expect(res.statusCode).toBe(200)
    expect(db.tenant.findUnique).not.toHaveBeenCalled()
  })

  describe('creatableTenants', () => {
    const linked = [
      { id: 'tenant-a', slug: 'agencia-a', name: 'Agência A' },
      { id: 'tenant-b', slug: 'agencia-b', name: 'Agência B' },
    ]
    const get = (role: string, tenantId?: string) => {
      db.destination.findUnique.mockResolvedValue({ id: 'dest-1', active: true, approvalStatus: 'APPROVED' })
      db.tenant.findFirst.mockResolvedValue({ id: 'tenant-a' })
      db.tourPackage.findMany.mockResolvedValue([])
      db.tenant.findMany.mockResolvedValue(linked)
      return app.inject({ method: 'GET', url: '/edit/destinations/serra/packages', headers: auth(role, tenantId) })
    }

    it('equipe: todas as agências ligadas', async () => {
      const res = await get('SUPER_ADMIN')
      expect(res.json().creatableTenants).toEqual([
        { slug: 'agencia-a', name: 'Agência A' },
        { slug: 'agencia-b', name: 'Agência B' },
      ])
      expect(db.tenant.findMany.mock.calls[0][0].where).toEqual({ destinationId: 'dest-1' })
    })

    it('ADMIN: só a própria agência', async () => {
      const res = await get('ADMIN', 'tenant-b')
      expect(res.json().creatableTenants).toEqual([{ slug: 'agencia-b', name: 'Agência B' }])
    })

    it('CONDUTOR: só a própria agência', async () => {
      const res = await get('CONDUTOR', 'tenant-a')
      expect(res.json().creatableTenants).toEqual([{ slug: 'agencia-a', name: 'Agência A' }])
    })

    it('usuário de agência não ligada ao destino: []', async () => {
      const res = await get('ADMIN', 'tenant-z')
      expect(res.json().creatableTenants).toEqual([])
    })
  })

  it('destino inexistente → 404', async () => {
    db.destination.findUnique.mockResolvedValue(null)
    const res = await app.inject({ method: 'GET', url: '/edit/destinations/x/packages', headers: auth('SUPER_ADMIN') })
    expect(res.statusCode).toBe(404)
  })
})
