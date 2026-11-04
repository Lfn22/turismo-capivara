import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'

vi.mock('../../database', () => {
  const db: Record<string, any> = {
    tenant: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    guideProfile: { findUnique: vi.fn() },
    destination: { findUnique: vi.fn() },
    tourPackage: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    packageGuide: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    departureSlot: { createMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    booking: { count: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  }
  db.$transaction = vi.fn(async (fn: any) => fn(db))
  return { default: db }
})

import { buildApp } from '../../__tests__/helpers/build-app'
import { packagesRoutes } from './packages.routes'
import { destinationsRoutes } from '../destinations/destinations.routes'
import { guidesRoutes } from '../guides/guides.routes'
import { packageMembershipRoutes } from '../memberships/package-membership.routes'
import prisma from '../../database'

const db = prisma as any
const app = buildApp(packagesRoutes, destinationsRoutes, guidesRoutes, packageMembershipRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())

const TENANT_A = { id: 'tenant-a', slug: 'agencia-a' }

beforeEach(() => {
  vi.resetAllMocks()
  db.$transaction.mockImplementation(async (fn: any) => fn(db))
  db.auditLog.create.mockResolvedValue({})
  db.tenant.findUnique.mockResolvedValue(TENANT_A)
})

function auth(role: string, tenantId = 'tenant-a', sub = 'user-1') {
  db.user.findUnique.mockResolvedValue({ role, approvalStatus: 'APPROVED' })
  const t = app.jwt.sign({ sub, role, tenantId, name: 'Teste', approvalStatus: 'APPROVED' })
  return { authorization: `Bearer ${t}` }
}

const pkg = { id: 'p1', tenantId: 'tenant-a', conductorId: 'cond-1', active: true, publishedAt: new Date('2026-01-01') }
const newBody = {
  name: 'Trilha', description: 'Descrição', duration: 2, price: 100, capacity: 10, difficulty: 'EASY',
}

describe('PUT /tenants/:slug/packages/:id', () => {
  it('PLATFORM_ADMIN edita roteiro de qualquer agência → 200', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    db.tourPackage.update.mockResolvedValue({ ...pkg, name: 'Novo' })
    const res = await app.inject({
      method: 'PUT', url: '/tenants/agencia-a/packages/p1',
      headers: auth('PLATFORM_ADMIN', 'outro-tenant'), payload: { name: 'Novo' },
    })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).toHaveBeenCalled()
  })

  it('ADMIN de outra agência → 403 e sem update', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    const res = await app.inject({
      method: 'PUT', url: '/tenants/agencia-a/packages/p1',
      headers: auth('ADMIN', 'tenant-b'), payload: { name: 'Novo' },
    })
    expect(res.statusCode).toBe(403)
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })

  it('CONDUTOR que não é o condutor → 403 e sem update', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    const res = await app.inject({
      method: 'PUT', url: '/tenants/agencia-a/packages/p1',
      headers: auth('CONDUTOR', 'tenant-a', 'outro-guia'), payload: { name: 'Novo' },
    })
    expect(res.statusCode).toBe(403)
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })

  it('aceita photos e highlights', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    db.tourPackage.update.mockResolvedValue(pkg)
    const res = await app.inject({
      method: 'PUT', url: '/tenants/agencia-a/packages/p1',
      headers: auth('ADMIN'),
      payload: { photos: ['https://x.com/a.jpg'], highlights: ['Vista incrível'] },
    })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { photos: ['https://x.com/a.jpg'], highlights: ['Vista incrível'] },
    })
  })
})

describe('POST /tenants/:slug/packages', () => {
  it('SUPER_ADMIN cria rascunho sem condutor e sem PackageGuide', async () => {
    db.tourPackage.create.mockResolvedValue({ id: 'p9' })
    const res = await app.inject({
      method: 'POST', url: '/tenants/agencia-a/packages',
      headers: auth('SUPER_ADMIN', 'outro'), payload: newBody,
    })
    expect(res.statusCode).toBe(201)
    const data = db.tourPackage.create.mock.calls[0][0].data
    expect(data.conductorId).toBeNull()
    expect(data.publishedAt).toBeNull()
    expect(data.tenantId).toBe('tenant-a')
    expect(db.packageGuide.create).not.toHaveBeenCalled()
  })

  it('CONDUTOR cria rascunho com PackageGuide ACCEPTED', async () => {
    db.guideProfile.findUnique.mockResolvedValue({ id: 'gp1' })
    db.tourPackage.create.mockResolvedValue({ id: 'p9' })
    const res = await app.inject({
      method: 'POST', url: '/tenants/agencia-a/packages',
      headers: auth('CONDUTOR'), payload: newBody,
    })
    expect(res.statusCode).toBe(201)
    const data = db.tourPackage.create.mock.calls[0][0].data
    expect(data.conductorId).toBe('user-1')
    expect(data.publishedAt).toBeNull()
    expect(db.packageGuide.create).toHaveBeenCalled()
  })

  it('aceita photos e highlights opcionais', async () => {
    db.guideProfile.findUnique.mockResolvedValue(null)
    db.tourPackage.create.mockResolvedValue({ id: 'p9' })
    const res = await app.inject({
      method: 'POST', url: '/tenants/agencia-a/packages',
      headers: auth('ADMIN'),
      payload: { ...newBody, photos: ['https://x.com/a.jpg'], highlights: ['Vista incrível'] },
    })
    expect(res.statusCode).toBe(201)
    const data = db.tourPackage.create.mock.calls[0][0].data
    expect(data.photos).toEqual(['https://x.com/a.jpg'])
    expect(data.highlights).toEqual(['Vista incrível'])
  })
})

describe('publish / unpublish / restore', () => {
  it('publish de rascunho grava publishedAt', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ ...pkg, publishedAt: null })
    db.tourPackage.update.mockResolvedValue({})
    const res = await app.inject({
      method: 'POST', url: '/tenants/agencia-a/packages/p1/publish', headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { publishedAt: expect.any(Date) },
    })
    expect(res.json().id).toBe('p1')
  })

  it('publish de já publicado → 200 sem update', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    const res = await app.inject({
      method: 'POST', url: '/tenants/agencia-a/packages/p1/publish', headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })

  it('publish por quem não pode editar → 403', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ ...pkg, publishedAt: null })
    const res = await app.inject({
      method: 'POST', url: '/tenants/agencia-a/packages/p1/publish',
      headers: auth('CONDUTOR', 'tenant-a', 'outro'),
    })
    expect(res.statusCode).toBe(403)
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })

  it('publish por guia ainda não verificado → 403', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ ...pkg, publishedAt: null })
    const headers = auth('CONDUTOR', 'tenant-a', 'cond-1')
    db.user.findUnique.mockResolvedValue({ approvalStatus: 'PENDING' })
    const res = await app.inject({
      method: 'POST', url: '/tenants/agencia-a/packages/p1/publish', headers,
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().message).toBe('Guia não aprovado para publicar roteiros')
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })

  it('publish por guia verificado e dono do roteiro → 200', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ ...pkg, publishedAt: null })
    db.tourPackage.update.mockResolvedValue({})
    const res = await app.inject({
      method: 'POST', url: '/tenants/agencia-a/packages/p1/publish',
      headers: auth('CONDUTOR', 'tenant-a', 'cond-1'),
    })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).toHaveBeenCalled()
  })

  it('unpublish volta para rascunho', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    db.tourPackage.update.mockResolvedValue({})
    const res = await app.inject({
      method: 'POST', url: '/tenants/agencia-a/packages/p1/unpublish', headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { publishedAt: null },
    })
  })

  it('restore depois de arquivar → active true, sem tocar publishedAt', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    db.tourPackage.update.mockResolvedValue({})
    const del = await app.inject({
      method: 'DELETE', url: '/tenants/agencia-a/packages/p1', headers: auth('ADMIN'),
    })
    expect(del.statusCode).toBe(200)
    expect(db.tourPackage.update).toHaveBeenLastCalledWith({ where: { id: 'p1' }, data: { active: false } })

    db.tourPackage.findFirst.mockResolvedValue({ ...pkg, active: false })
    const res = await app.inject({
      method: 'POST', url: '/tenants/agencia-a/packages/p1/restore', headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).toHaveBeenLastCalledWith({ where: { id: 'p1' }, data: { active: true } })
  })

  it('restore de já ativo → 200 sem update', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    const res = await app.inject({
      method: 'POST', url: '/tenants/agencia-a/packages/p1/restore', headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })
})

describe('POST /tenants/:slug/packages/:id/slots/batch', () => {
  const batchBody = { startDate: '2027-01-04', endDate: '2027-01-10', timeOfDay: '08:00', capacity: 10, daysOfWeek: [1] }

  it('guia ainda não verificado → 403 sem criar datas', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    const headers = auth('CONDUTOR', 'tenant-a', 'cond-1')
    db.user.findUnique.mockResolvedValue({ approvalStatus: 'PENDING' })
    const res = await app.inject({
      method: 'POST', url: '/tenants/agencia-a/packages/p1/slots/batch', headers, payload: batchBody,
    })
    expect(res.statusCode).toBe(403)
    expect(db.departureSlot.createMany).not.toHaveBeenCalled()
  })

  it('guia verificado e dono do roteiro → 201', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    db.departureSlot.createMany.mockResolvedValue({ count: 1 })
    const res = await app.inject({
      method: 'POST', url: '/tenants/agencia-a/packages/p1/slots/batch',
      headers: auth('CONDUTOR', 'tenant-a', 'cond-1'), payload: batchBody,
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({ created: 1 })
  })
})

describe('DELETE /tenants/:slug/packages/:id/slots/:slotId', () => {
  const slot = { id: 's1', status: 'OPEN', package: { id: 'p1', tenantId: 'tenant-a', conductorId: 'cond-1' } }

  it('com reserva confirmada → 409 sem cancelar nada', async () => {
    db.departureSlot.findFirst.mockResolvedValue(slot)
    db.booking.count.mockResolvedValue(1)
    const res = await app.inject({
      method: 'DELETE', url: '/tenants/agencia-a/packages/p1/slots/s1', headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Esta data tem reservas confirmadas. Cancele-as antes de fechar.')
    expect(db.booking.count).toHaveBeenCalledWith({ where: { slotId: 's1', status: 'CONFIRMED' } })
    expect(db.departureSlot.update).not.toHaveBeenCalled()
    expect(db.booking.updateMany).not.toHaveBeenCalled()
  })

  it('sem reserva confirmada → cancela o slot e as pendentes', async () => {
    db.departureSlot.findFirst.mockResolvedValue(slot)
    db.booking.count.mockResolvedValue(0)
    db.departureSlot.update.mockResolvedValue({})
    db.booking.updateMany.mockResolvedValue({ count: 2 })
    const res = await app.inject({
      method: 'DELETE', url: '/tenants/agencia-a/packages/p1/slots/s1', headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Slot cancelado', bookingsCancelled: 2 })
    expect(db.departureSlot.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { status: 'CANCELLED' } })
  })
})

describe('PATCH /tenants/:slug/packages/:id (equipe)', () => {
  it('PLATFORM_ADMIN altera fotos → 200', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    db.tourPackage.update.mockResolvedValue(pkg)
    const res = await app.inject({
      method: 'PATCH', url: '/tenants/agencia-a/packages/p1',
      headers: auth('PLATFORM_ADMIN', 'x'), payload: { photos: ['https://x.com/a.jpg'] },
    })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).toHaveBeenCalled()
  })
})

describe('leituras públicas só mostram publicados', () => {
  const published = { publishedAt: { not: null } }

  it('GET /tenants/:slug/packages', async () => {
    db.tourPackage.findMany.mockResolvedValue([])
    const res = await app.inject({ method: 'GET', url: '/tenants/agencia-a/packages' })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.findMany.mock.calls[0][0].where).toMatchObject({ active: true, ...published })
  })

  it('GET /tenants/:slug/packages/:id', async () => {
    db.tourPackage.findFirst.mockResolvedValue(null)
    const res = await app.inject({ method: 'GET', url: '/tenants/agencia-a/packages/p1' })
    expect(res.statusCode).toBe(404)
    expect(db.tourPackage.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'p1', active: true, ...published })
  })

  it('GET /destinations/:slug/packages', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'd1' })
    db.tourPackage.findMany.mockResolvedValue([])
    const res = await app.inject({ method: 'GET', url: '/destinations/serra/packages' })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.findMany.mock.calls[0][0].where).toMatchObject({ active: true, ...published })
  })

  it('GET /guides/:id/packages', async () => {
    db.packageGuide.findMany.mockResolvedValue([])
    const res = await app.inject({ method: 'GET', url: '/guides/g1/packages' })
    expect(res.statusCode).toBe(200)
    expect(db.packageGuide.findMany.mock.calls[0][0].where).toMatchObject({
      guideId: 'g1', status: 'ACCEPTED', package: { active: true, ...published },
    })
  })

  it('GET /packages/:id/guides → 404 para rascunho', async () => {
    db.tourPackage.findFirst.mockResolvedValue(null)
    const res = await app.inject({ method: 'GET', url: '/packages/p1/guides' })
    expect(res.statusCode).toBe(404)
    expect(db.tourPackage.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'p1', active: true, ...published })
    expect(db.packageGuide.findMany).not.toHaveBeenCalled()
  })

  it('POST /packages/:id/guides/me → 404 Roteiro não encontrado para rascunho', async () => {
    const headers = auth('CONDUTOR', 'tenant-a', 'u9')
    db.user.findUnique.mockResolvedValue({
      role: 'CONDUTOR', name: 'G', approvalStatus: 'APPROVED', guideProfile: { id: 'gp1' },
    })
    db.tourPackage.findUnique.mockResolvedValue({
      id: 'p1', tenantId: 'tenant-a', conductorId: 'c1', active: true, publishedAt: null,
      tenant: { slug: 'x', name: 'X' }, conductor: { name: 'C' },
    })
    const res = await app.inject({ method: 'POST', url: '/packages/p1/guides/me', headers })
    expect(res.statusCode).toBe(404)
    expect(res.json().message).toBe('Roteiro não encontrado')
  })
})

describe('GET /tenants/:slug/manage/packages', () => {
  const base = { ...pkg, description: 'd', price: '10', duration: 2, capacity: 5, difficulty: 'EASY', photos: [], highlights: [] }
  const rows = [
    { ...base, id: 'p1', name: 'A' },
    { ...base, id: 'p2', name: 'B', conductorId: 'outro', publishedAt: null },
    { ...base, id: 'p3', name: 'C', active: false },
  ]

  it('ADMIN do tenant vê todos, com status de rascunho e oculto', async () => {
    db.tourPackage.findMany.mockResolvedValue(rows)
    const res = await app.inject({ method: 'GET', url: '/tenants/agencia-a/manage/packages', headers: auth('ADMIN') })
    expect(res.statusCode).toBe(200)
    expect(res.json().packages.map((p: any) => [p.id, p.status])).toEqual([
      ['p1', 'PUBLISHED'], ['p2', 'DRAFT'], ['p3', 'HIDDEN'],
    ])
  })

  it('CONDUTOR vê só os próprios roteiros', async () => {
    db.tourPackage.findMany.mockResolvedValue(rows)
    const res = await app.inject({ method: 'GET', url: '/tenants/agencia-a/manage/packages', headers: auth('CONDUTOR', 'tenant-a', 'cond-1') })
    expect(res.json().packages.map((p: any) => p.id)).toEqual(['p1', 'p3'])
  })

  it('ADMIN de outra agência → 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/tenants/agencia-a/manage/packages', headers: auth('ADMIN', 'tenant-b') })
    expect(res.statusCode).toBe(403)
  })

  it('sem token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/tenants/agencia-a/manage/packages' })
    expect(res.statusCode).toBe(401)
  })
})
