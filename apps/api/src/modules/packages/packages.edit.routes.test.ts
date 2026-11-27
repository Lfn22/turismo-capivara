import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'

vi.mock('../../database', () => {
  const db: Record<string, any> = {
    tenant: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    guideProfile: { findUnique: vi.fn() },
    destination: { findUnique: vi.fn() },
    tourPackage: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    packageChangeRequest: { findFirst: vi.fn() },
    packageGuide: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    departureSlot: {
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    booking: { count: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  }
  db.$transaction = vi.fn(async (fn: any) => fn(db))
  db.$queryRaw = vi.fn()
  return { default: db }
})

vi.mock('../bookings/cancel-booking', () => ({
  cancelBooking: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../bookings/cancel-future-slots', () => ({
  cancelFutureSlots: vi.fn().mockResolvedValue({ slotsCancelled: 0, bookingsCancelled: 0 }),
}))

vi.mock('../package-requests/package-requests.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../package-requests/package-requests.service')>()),
  submitRequest: vi.fn(),
  latestRequestsByPackage: vi.fn(),
}))

import { buildApp } from '../../__tests__/helpers/build-app'
import { cancelFutureSlots } from '../bookings/cancel-future-slots'
import {
  submitRequest,
  latestRequestsByPackage,
} from '../package-requests/package-requests.service'
import { cancelBooking } from '../bookings/cancel-booking'
import { packagesRoutes } from './packages.routes'
import { destinationsRoutes } from '../destinations/destinations.routes'
import { guidesRoutes } from '../guides/guides.routes'
import { packageMembershipRoutes } from '../memberships/package-membership.routes'
import prisma from '../../database'
import { Prisma } from '@prisma/client'
import { AppError } from '../../shared/errors/AppError'

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
  ;(latestRequestsByPackage as any).mockResolvedValue(new Map())
  ;(submitRequest as any).mockResolvedValue({ id: 'req-1', type: 'UPDATE', changes: {} })
})

function auth(role: string, tenantId = 'tenant-a', sub = 'user-1') {
  db.user.findUnique.mockResolvedValue({ role, approvalStatus: 'APPROVED' })
  const t = app.jwt.sign({ sub, role, tenantId, name: 'Teste', approvalStatus: 'APPROVED' })
  return { authorization: `Bearer ${t}` }
}

const pkg = {
  id: 'p1',
  tenantId: 'tenant-a',
  conductorId: 'cond-1',
  active: true,
  publishedAt: new Date('2026-01-01'),
}
const newBody = {
  name: 'Trilha',
  description: 'Descrição',
  duration: 2,
  price: 100,
  capacity: 10,
  difficulty: 'EASY',
}

describe('PUT /tenants/:slug/packages/:id', () => {
  it('PLATFORM_ADMIN edita roteiro de qualquer agência → 200', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    db.tourPackage.update.mockResolvedValue({ ...pkg, name: 'Novo' })
    const res = await app.inject({
      method: 'PUT',
      url: '/tenants/agencia-a/packages/p1',
      headers: auth('PLATFORM_ADMIN', 'outro-tenant'),
      payload: { name: 'Novo' },
    })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).toHaveBeenCalled()
  })

  it('ADMIN de outra agência → 403 e sem update', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    const res = await app.inject({
      method: 'PUT',
      url: '/tenants/agencia-a/packages/p1',
      headers: auth('ADMIN', 'tenant-b'),
      payload: { name: 'Novo' },
    })
    expect(res.statusCode).toBe(403)
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })

  it('CONDUTOR que não é o condutor → 403 e sem update', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    const res = await app.inject({
      method: 'PUT',
      url: '/tenants/agencia-a/packages/p1',
      headers: auth('CONDUTOR', 'tenant-a', 'outro-guia'),
      payload: { name: 'Novo' },
    })
    expect(res.statusCode).toBe(403)
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })

  it('aceita photos e highlights', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    db.tourPackage.update.mockResolvedValue(pkg)
    const res = await app.inject({
      method: 'PUT',
      url: '/tenants/agencia-a/packages/p1',
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
      method: 'POST',
      url: '/tenants/agencia-a/packages',
      headers: auth('SUPER_ADMIN', 'outro'),
      payload: newBody,
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
      method: 'POST',
      url: '/tenants/agencia-a/packages',
      headers: auth('CONDUTOR'),
      payload: newBody,
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
      method: 'POST',
      url: '/tenants/agencia-a/packages',
      headers: auth('ADMIN'),
      payload: { ...newBody, photos: ['https://x.com/a.jpg'], highlights: ['Vista incrível'] },
    })
    expect(res.statusCode).toBe(201)
    const data = db.tourPackage.create.mock.calls[0][0].data
    expect(data.photos).toEqual(['https://x.com/a.jpg'])
    expect(data.highlights).toEqual(['Vista incrível'])
  })
})

describe('POST /tenants/:slug/packages — valor do grupo', () => {
  const { capacity: _ignored, ...bodyNoCapacity } = newBody

  it('sem capacity, com extraGuidePrice → 201, grava capacity 8 e extraGuidePrice', async () => {
    db.guideProfile.findUnique.mockResolvedValue(null)
    db.tourPackage.create.mockResolvedValue({ id: 'p9' })
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages',
      headers: auth('ADMIN'),
      payload: { ...bodyNoCapacity, price: 600, extraGuidePrice: 400 },
    })
    expect(res.statusCode).toBe(201)
    const data = db.tourPackage.create.mock.calls[0][0].data
    expect(data.capacity).toBe(8)
    expect(data.extraGuidePrice).toBe(400)
    expect(data.price).toBe(600)
  })

  it('capacity enviada por cliente antigo é ignorada (grava 8)', async () => {
    db.guideProfile.findUnique.mockResolvedValue(null)
    db.tourPackage.create.mockResolvedValue({ id: 'p9' })
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages',
      headers: auth('ADMIN'),
      payload: { ...bodyNoCapacity, capacity: 30 },
    })
    expect(res.statusCode).toBe(201)
    expect(db.tourPackage.create.mock.calls[0][0].data.capacity).toBe(8)
  })

  it('extraGuidePrice negativo → 400 com mensagem em português', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages',
      headers: auth('ADMIN'),
      payload: { ...bodyNoCapacity, extraGuidePrice: -1 },
    })
    expect(res.statusCode).toBe(400)
    expect(JSON.stringify(res.json())).toContain('Valor do guia extra')
    expect(db.tourPackage.create).not.toHaveBeenCalled()
  })

  it('PUT permite alterar extraGuidePrice e não toca capacity', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    db.tourPackage.update.mockResolvedValue(pkg)
    const res = await app.inject({
      method: 'PUT',
      url: '/tenants/agencia-a/packages/p1',
      headers: auth('ADMIN'),
      payload: { extraGuidePrice: null, capacity: 30 },
    })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { extraGuidePrice: null },
    })
  })
})

describe('publish / unpublish / restore', () => {
  it('publish de rascunho grava publishedAt', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ ...pkg, publishedAt: null })
    db.tourPackage.update.mockResolvedValue({})
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages/p1/publish',
      headers: auth('ADMIN'),
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
      method: 'POST',
      url: '/tenants/agencia-a/packages/p1/publish',
      headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })

  it('publish por quem não pode editar → 403', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ ...pkg, publishedAt: null })
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages/p1/publish',
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
      method: 'POST',
      url: '/tenants/agencia-a/packages/p1/publish',
      headers,
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().message).toBe('Guia não aprovado para publicar roteiros')
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })

  it('publish por guia verificado e dono do roteiro → 202 (pedido), sem publicar', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ ...pkg, publishedAt: null })
    ;(submitRequest as any).mockResolvedValue({ id: 'req-1', type: 'PUBLISH' })
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages/p1/publish',
      headers: auth('CONDUTOR', 'tenant-a', 'cond-1'),
    })
    expect(res.statusCode).toBe(202)
    expect(res.json()).toEqual({
      requestId: 'req-1',
      type: 'PUBLISH',
      status: 'PENDING',
      message: 'Enviado para aprovação da equipe',
    })
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })

  it('unpublish volta para rascunho', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    db.tourPackage.update.mockResolvedValue({})
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages/p1/unpublish',
      headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { publishedAt: null },
    })
  })

  it('unpublish cancela as datas futuras e estorna as reservas', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    db.tourPackage.update.mockResolvedValue({})
    ;(cancelFutureSlots as any).mockResolvedValue({ slotsCancelled: 2, bookingsCancelled: 3 })
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages/p1/unpublish',
      headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(200)
    expect(cancelFutureSlots).toHaveBeenCalledWith({ packageId: 'p1' }, expect.anything())
    expect(res.json()).toMatchObject({ slotsCancelled: 2, bookingsCancelled: 3 })
  })

  it('arquivar (DELETE) cancela as datas futuras e estorna as reservas', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    db.tourPackage.update.mockResolvedValue({})
    const res = await app.inject({
      method: 'DELETE',
      url: '/tenants/agencia-a/packages/p1',
      headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(200)
    expect(cancelFutureSlots).toHaveBeenCalledWith({ packageId: 'p1' }, expect.anything())
    expect(db.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { active: false },
    })
  })

  it('arquivar: estorno falhou → não arquiva', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    ;(cancelFutureSlots as any).mockRejectedValueOnce(
      Object.assign(new Error('x'), { statusCode: 502 }),
    )
    const res = await app.inject({
      method: 'DELETE',
      url: '/tenants/agencia-a/packages/p1',
      headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBeGreaterThanOrEqual(500)
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })

  it('restore depois de arquivar → active true, sem tocar publishedAt', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    db.tourPackage.update.mockResolvedValue({})
    const del = await app.inject({
      method: 'DELETE',
      url: '/tenants/agencia-a/packages/p1',
      headers: auth('ADMIN'),
    })
    expect(del.statusCode).toBe(200)
    expect(db.tourPackage.update).toHaveBeenLastCalledWith({
      where: { id: 'p1' },
      data: { active: false },
    })

    db.tourPackage.findFirst.mockResolvedValue({ ...pkg, active: false })
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages/p1/restore',
      headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).toHaveBeenLastCalledWith({
      where: { id: 'p1' },
      data: { active: true },
    })
  })

  it('restore de já ativo → 200 sem update', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages/p1/restore',
      headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })
})

describe('POST /tenants/:slug/packages/:id/slots/batch', () => {
  const batchBody = {
    startDate: '2027-01-04',
    endDate: '2027-01-10',
    timeOfDay: '08:00',
    maxGuides: 1,
    daysOfWeek: [1],
  }

  it('guia ainda não verificado → 403 sem criar datas', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    const headers = auth('CONDUTOR', 'tenant-a', 'cond-1')
    db.user.findUnique.mockResolvedValue({ approvalStatus: 'PENDING' })
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages/p1/slots/batch',
      headers,
      payload: batchBody,
    })
    expect(res.statusCode).toBe(403)
    expect(db.departureSlot.createMany).not.toHaveBeenCalled()
  })

  it('guia verificado e dono do roteiro → 201', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    db.departureSlot.createMany.mockResolvedValue({ count: 1 })
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages/p1/slots/batch',
      headers: auth('CONDUTOR', 'tenant-a', 'cond-1'),
      payload: batchBody,
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({ created: 1 })
  })

  it('sem maxGuides grava 1 guia e capacidade 8; capacity de cliente antigo é ignorada', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    db.departureSlot.createMany.mockResolvedValue({ count: 1 })
    const { maxGuides: _m, ...semGuias } = batchBody
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages/p1/slots/batch',
      headers: auth('CONDUTOR', 'tenant-a', 'cond-1'),
      payload: { ...semGuias, capacity: 30 },
    })
    expect(res.statusCode).toBe(201)
    expect(db.departureSlot.createMany.mock.calls[0][0].data[0]).toMatchObject({
      capacity: 8,
      maxGuides: 1,
    })
  })

  it('maxGuides 6 → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages/p1/slots/batch',
      headers: auth('ADMIN'),
      payload: { ...batchBody, maxGuides: 6 },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().errors[0].message).toBe('Máximo de 5 guias por horário')
  })

  it('guideId de guia de outra agência fora do roteiro → 422 sem criar datas', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    const headers = auth('ADMIN', 'tenant-a')
    db.guideProfile.findUnique.mockResolvedValue({
      userId: 'u-b',
      user: { tenantId: 'tenant-b', approvalStatus: 'APPROVED' },
    })
    db.packageGuide.findFirst.mockResolvedValue(null)
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages/p1/slots/batch',
      headers,
      payload: { ...batchBody, guideId: 'gp-outra-agencia' },
    })
    expect(res.statusCode).toBe(422)
    expect(res.json().message).toBe('Guia não faz parte deste roteiro')
    expect(db.departureSlot.createMany).not.toHaveBeenCalled()
  })
})

describe('POST slots/batch — guia, fuso e conflito', () => {
  const body = {
    startDate: '2027-01-04',
    endDate: '2027-01-10',
    timeOfDay: '08:00',
    maxGuides: 2,
    daysOfWeek: [1],
  }

  function ownProfile() {
    // perfil do próprio CONDUTOR (por userId) e, na checagem, o mesmo perfil (por id)
    db.guideProfile.findUnique.mockImplementation(async ({ where }: any) =>
      where.userId === 'cond-1' || where.id === 'gp-cond'
        ? {
            id: 'gp-cond',
            userId: 'cond-1',
            user: { tenantId: 'tenant-a', approvalStatus: 'APPROVED' },
          }
        : null,
    )
  }

  it('CONDUTOR sem guideId agenda a si mesmo, às 08:00 de São Paulo (11:00 UTC)', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    ownProfile()
    db.departureSlot.findMany.mockResolvedValue([])
    db.departureSlot.createMany.mockResolvedValue({ count: 1 })
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages/p1/slots/batch',
      headers: auth('CONDUTOR', 'tenant-a', 'cond-1'),
      payload: body,
    })
    expect(res.statusCode).toBe(201)
    const data = db.departureSlot.createMany.mock.calls[0][0].data
    expect(data).toHaveLength(1)
    expect(data[0].guideId).toBe('gp-cond')
    expect(data[0]).toMatchObject({ capacity: 16, maxGuides: 2 })
    expect(data[0].startsAt.toISOString()).toBe('2027-01-04T11:00:00.000Z')
  })

  it('conflito com a agenda do guia → 409 com código GUIDE_SCHEDULE_CONFLICT', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ ...pkg, durationMaxHours: 3, bufferMinutes: 60 })
    ownProfile()
    db.departureSlot.findMany.mockResolvedValue([
      {
        startsAt: new Date('2027-01-04T13:00:00Z'),
        package: { durationMaxHours: 2, bufferMinutes: 0, name: 'Outro' },
        guide: null,
      },
    ])
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages/p1/slots/batch',
      headers: auth('CONDUTOR', 'tenant-a', 'cond-1'),
      payload: body,
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('GUIDE_SCHEDULE_CONFLICT')
    expect(db.departureSlot.createMany).not.toHaveBeenCalled()
  })
})

describe('POST /tenants/:slug/packages/:id/slots', () => {
  const create = (payload: Record<string, unknown>) =>
    app.inject({
      method: 'POST',
      url: '/tenants/agencia-a/packages/p1/slots',
      headers: auth('ADMIN'),
      payload: { startsAt: new Date(Date.now() + 5 * 24 * 3600_000).toISOString(), ...payload },
    })

  beforeEach(() => {
    db.tourPackage.findFirst.mockResolvedValue({ ...pkg, durationMaxHours: 2, bufferMinutes: 0 })
    db.guideProfile.findUnique.mockResolvedValue({
      id: 'gp1',
      userId: 'u1',
      user: { tenantId: 'tenant-a', approvalStatus: 'APPROVED' },
    })
    db.packageGuide.findFirst.mockResolvedValue({ id: 'pg1' })
    db.departureSlot.findMany.mockResolvedValue([])
    db.departureSlot.create.mockImplementation(async ({ data }: any) => ({ id: 's1', ...data }))
  })

  it('maxGuides 2 → capacity 16', async () => {
    const res = await create({ guideId: 'gp1', maxGuides: 2 })
    expect(res.statusCode).toBe(201)
    expect(db.departureSlot.create.mock.calls[0][0].data).toMatchObject({
      capacity: 16,
      maxGuides: 2,
    })
    expect(res.json()).toMatchObject({ capacity: 16, maxGuides: 2 })
  })

  it('sem maxGuides → 1 guia e capacity 8 (capacity/minCapacity antigos ignorados)', async () => {
    const res = await create({ guideId: 'gp1', capacity: 30, minCapacity: 5 })
    expect(res.statusCode).toBe(201)
    expect(db.departureSlot.create.mock.calls[0][0].data).toMatchObject({
      capacity: 8,
      maxGuides: 1,
    })
  })

  it('maxGuides 6 → 400', async () => {
    const res = await create({ guideId: 'gp1', maxGuides: 6 })
    expect(res.statusCode).toBe(400)
    expect(res.json().errors[0].message).toBe('Máximo de 5 guias por horário')
    expect(db.departureSlot.create).not.toHaveBeenCalled()
  })
})

describe('PATCH /tenants/:slug/packages/:id/slots/:slotId', () => {
  const slotRow = (over: Record<string, unknown> = {}) => ({
    id: 's1',
    status: 'OPEN',
    booked: 3,
    capacity: 8,
    maxGuides: 1,
    guideId: null,
    startsAt: new Date(Date.now() + 5 * 24 * 3600_000),
    ...over,
  })
  const patch = (payload: Record<string, unknown>) =>
    app.inject({
      method: 'PATCH',
      url: '/tenants/agencia-a/packages/p1/slots/s1',
      headers: auth('ADMIN'),
      payload,
    })

  beforeEach(() => {
    db.departureSlot.findFirst.mockResolvedValue({
      id: 's1',
      package: { ...pkg, durationMaxHours: 2, bufferMinutes: 0 },
    })
    db.departureSlot.update.mockImplementation(async ({ data }: any) => ({ id: 's1', ...data }))
  })

  it('reduzir guias abaixo do que a reserva exige → 422', async () => {
    db.$queryRaw.mockResolvedValue([slotRow({ booked: 12, capacity: 16, maxGuides: 2 })])
    const res = await patch({ maxGuides: 1 })
    expect(res.statusCode).toBe(422)
    expect(res.json().message).toBe('Este horário já tem uma reserva que precisa de 2 guias')
    expect(db.departureSlot.update).not.toHaveBeenCalled()
  })

  it('maxGuides 6 → 400', async () => {
    const res = await patch({ maxGuides: 6 })
    expect(res.statusCode).toBe(400)
    expect(res.json().errors[0].message).toBe('Máximo de 5 guias por horário')
  })

  it('mudar o horário de data com reservas → 409', async () => {
    db.$queryRaw.mockResolvedValue([slotRow({ booked: 1 })])
    const res = await patch({ startsAt: new Date(Date.now() + 6 * 24 * 3600_000).toISOString() })
    expect(res.statusCode).toBe(409)
  })

  it('data cancelada não é editável → 422', async () => {
    db.$queryRaw.mockResolvedValue([slotRow({ status: 'CANCELLED' })])
    const res = await patch({ maxGuides: 2 })
    expect(res.statusCode).toBe(422)
  })

  it('aumentar os guias de uma data reservada não reabre (reserva ocupa o horário inteiro)', async () => {
    db.$queryRaw.mockResolvedValue([slotRow({ status: 'FULL', booked: 4, capacity: 8 })])
    const res = await patch({ maxGuides: 2 })
    expect(res.statusCode).toBe(200)
    expect(db.departureSlot.update.mock.calls[0][0].data).toMatchObject({
      capacity: 16,
      maxGuides: 2,
      status: 'FULL',
    })
  })

  it('editar data reservada mantendo o mesmo horário continua FULL', async () => {
    const row = slotRow({ status: 'FULL', booked: 4, capacity: 8 })
    db.$queryRaw.mockResolvedValue([row])
    const res = await patch({ startsAt: row.startsAt.toISOString() })
    expect(res.statusCode).toBe(200)
    expect(db.departureSlot.update.mock.calls[0][0].data).toMatchObject({ status: 'FULL' })
  })

  it('data sem reservas fica OPEN', async () => {
    db.$queryRaw.mockResolvedValue([slotRow({ status: 'OPEN', booked: 0 })])
    await patch({ maxGuides: 2 })
    expect(db.departureSlot.update.mock.calls[0][0].data).toMatchObject({ status: 'OPEN' })
  })

  it('reduzir guias até lotar (OPEN → FULL)', async () => {
    db.$queryRaw.mockResolvedValue([
      slotRow({ status: 'OPEN', booked: 8, capacity: 16, maxGuides: 2 }),
    ])
    await patch({ maxGuides: 1 })
    expect(db.departureSlot.update.mock.calls[0][0].data).toMatchObject({
      capacity: 8,
      maxGuides: 1,
      status: 'FULL',
    })
  })

  it('capacity/minCapacity de cliente antigo são ignorados', async () => {
    db.$queryRaw.mockResolvedValue([slotRow({ booked: 3 })])
    const res = await patch({ capacity: 2, minCapacity: 6 })
    expect(res.statusCode).toBe(200)
    expect(db.departureSlot.update.mock.calls[0][0].data).toMatchObject({
      capacity: 8,
      maxGuides: 1,
    })
  })

  it('novo horário de data com guia checa a agenda do guia (exceto a própria data)', async () => {
    db.$queryRaw.mockResolvedValue([slotRow({ booked: 0, guideId: 'gp1' })])
    db.departureSlot.findMany.mockResolvedValue([])
    const res = await patch({ startsAt: new Date(Date.now() + 6 * 24 * 3600_000).toISOString() })
    expect(res.statusCode).toBe(200)
    expect(db.departureSlot.findMany.mock.calls[0][0].where).toMatchObject({
      guideId: 'gp1',
      id: { not: 's1' },
    })
  })

  it('data no passado → 422', async () => {
    db.$queryRaw.mockResolvedValue([slotRow({ booked: 0 })])
    const res = await patch({ startsAt: new Date(Date.now() - 3600_000).toISOString() })
    expect(res.statusCode).toBe(422)
  })
})

describe('GET /tenants/:slug/packages/:id/slots/manage (painel)', () => {
  it('editor vê todas as datas futuras, de qualquer status, inclusive de rascunho', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ ...pkg, publishedAt: null })
    db.departureSlot.findMany.mockResolvedValue([{ id: 's1', status: 'FULL' }])
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/agencia-a/packages/p1/slots/manage',
      headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([{ id: 's1', status: 'FULL' }])
    const where = db.departureSlot.findMany.mock.calls[0][0].where
    expect(where).not.toHaveProperty('status')
    expect((where.startsAt.gte as Date).getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('CONDUTOR que não edita o roteiro → 403', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/agencia-a/packages/p1/slots/manage',
      headers: auth('CONDUTOR', 'tenant-a', 'outro-guia'),
    })
    expect(res.statusCode).toBe(403)
  })

  it('sem token → 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/agencia-a/packages/p1/slots/manage',
    })
    expect(res.statusCode).toBe(401)
  })

  it('calendário: CONDUTOR que não edita o roteiro → 403', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/agencia-a/packages/p1/slots/calendar?month=2027-01',
      headers: auth('CONDUTOR', 'tenant-a', 'outro-guia'),
    })
    expect(res.statusCode).toBe(403)
  })
})

describe('DELETE /tenants/:slug/packages/:id/slots/:slotId', () => {
  const slot = {
    id: 's1',
    status: 'OPEN',
    package: { id: 'p1', tenantId: 'tenant-a', conductorId: 'cond-1' },
  }

  it('com reserva confirmada → 409 sem cancelar nada', async () => {
    db.departureSlot.findFirst.mockResolvedValue(slot)
    db.booking.count.mockResolvedValue(1)
    const res = await app.inject({
      method: 'DELETE',
      url: '/tenants/agencia-a/packages/p1/slots/s1',
      headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe(
      'Esta data tem reservas confirmadas. Cancele-as antes de fechar.',
    )
    expect(db.booking.count).toHaveBeenCalledWith({ where: { slotId: 's1', status: 'CONFIRMED' } })
    expect(db.departureSlot.update).not.toHaveBeenCalled()
    expect(db.booking.updateMany).not.toHaveBeenCalled()
  })

  it('sem reserva confirmada → cancela o slot e as pendentes (com o PIX no MP)', async () => {
    db.departureSlot.findFirst.mockResolvedValue(slot)
    db.booking.count.mockResolvedValue(0)
    db.departureSlot.update.mockResolvedValue({})
    const pending = [
      { id: 'b1', status: 'PENDING', slotId: 's1', pax: 1, paymentId: 'mp1' },
      { id: 'b2', status: 'PENDING', slotId: 's1', pax: 2, paymentId: 'mp2' },
    ]
    db.booking.findMany.mockResolvedValue(pending)
    const res = await app.inject({
      method: 'DELETE',
      url: '/tenants/agencia-a/packages/p1/slots/s1',
      headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Slot cancelado', bookingsCancelled: 2 })
    expect(db.departureSlot.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { status: 'CANCELLED' },
    })
    // cancelBooking cancela a cobrança PIX; o updateMany direto deixava o PIX pagável
    expect(cancelBooking).toHaveBeenCalledWith(pending[0], expect.anything())
    expect(cancelBooking).toHaveBeenCalledWith(pending[1], expect.anything())
    expect(db.booking.updateMany).not.toHaveBeenCalled()
  })
})

describe('PATCH /tenants/:slug/packages/:id (equipe)', () => {
  it('PLATFORM_ADMIN altera fotos → 200', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    db.tourPackage.update.mockResolvedValue(pkg)
    const res = await app.inject({
      method: 'PATCH',
      url: '/tenants/agencia-a/packages/p1',
      headers: auth('PLATFORM_ADMIN', 'x'),
      payload: { photos: ['https://x.com/a.jpg'] },
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
    expect(db.tourPackage.findMany.mock.calls[0][0].where).toMatchObject({
      active: true,
      ...published,
    })
  })

  it('GET /tenants/:slug/packages com dateFrom e dateTo aplica os dois limites', async () => {
    db.tourPackage.findMany.mockResolvedValue([])
    await app.inject({
      method: 'GET',
      url: '/tenants/agencia-a/packages?dateFrom=2027-01-01T00:00:00.000Z&dateTo=2027-01-31T23:59:59.000Z',
    })
    const startsAt = db.tourPackage.findMany.mock.calls[0][0].where.departureSlots.some.startsAt
    expect(startsAt).toEqual({
      gte: new Date('2027-01-01T00:00:00.000Z'),
      lte: new Date('2027-01-31T23:59:59.000Z'),
    })
  })

  it('GET /tenants/:slug/packages?minAvailable filtra no banco, antes da paginação', async () => {
    db.$queryRaw.mockResolvedValue([{ packageId: 'p1' }, { packageId: 'p2' }])
    db.tourPackage.findMany.mockResolvedValue([])
    await app.inject({ method: 'GET', url: '/tenants/agencia-a/packages?minAvailable=3' })
    expect(db.$queryRaw).toHaveBeenCalled()
    expect(db.tourPackage.findMany.mock.calls[0][0].where.id).toEqual({ in: ['p1', 'p2'] })
  })

  it('GET /tenants/:slug/packages?minAvailable exige horário livre e pessoas <= guias x 8', async () => {
    db.$queryRaw.mockResolvedValue([])
    db.tourPackage.findMany.mockResolvedValue([])
    await app.inject({ method: 'GET', url: '/tenants/agencia-a/packages?minAvailable=12' })
    const [strings, ...values] = db.$queryRaw.mock.calls[0] as [string[], ...unknown[]]
    const sql = strings.join('?')
    expect(sql).toContain('JOIN "TourPackage"')
    expect(sql).toContain('ds.booked = 0')
    expect(sql).toContain('"extraGuidePrice" IS NULL')
    expect(sql).toContain('ds."maxGuides"')
    expect(values).toContain(12)
    expect(values).toContain(8)
  })

  it('GET /tenants/:slug/packages/:id', async () => {
    db.tourPackage.findFirst.mockResolvedValue(null)
    const res = await app.inject({ method: 'GET', url: '/tenants/agencia-a/packages/p1' })
    expect(res.statusCode).toBe(404)
    expect(db.tourPackage.findFirst.mock.calls[0][0].where).toMatchObject({
      id: 'p1',
      active: true,
      ...published,
    })
  })

  it('GET /tenants/:slug/packages/:id devolve extraGuidePrice e slots com maxGuides/maxPax/available', async () => {
    db.tourPackage.findFirst.mockResolvedValue({
      ...pkg,
      price: { toString: () => '600' },
      extraGuidePrice: null,
      departureSlots: [
        { id: 's1', booked: 0, status: 'OPEN', minCapacity: 1, maxGuides: 3 },
        { id: 's2', booked: 2, status: 'OPEN', minCapacity: 1, maxGuides: 1 },
      ],
    })
    const res = await app.inject({ method: 'GET', url: '/tenants/agencia-a/packages/p1' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.extraGuidePrice).toBeNull()
    expect(typeof body.price).toBe('number')
    expect(body.departureSlots[0]).toMatchObject({ maxGuides: 3, maxPax: 8, available: true })
    expect(body.departureSlots[1]).toMatchObject({ available: false })
  })

  it('GET /tenants/:slug/packages/:id com extraGuidePrice: maxPax = maxGuides x 8', async () => {
    db.tourPackage.findFirst.mockResolvedValue({
      ...pkg,
      price: 600,
      extraGuidePrice: { toString: () => '400' },
      departureSlots: [{ id: 's1', booked: 0, status: 'OPEN', minCapacity: 1, maxGuides: 3 }],
    })
    const res = await app.inject({ method: 'GET', url: '/tenants/agencia-a/packages/p1' })
    const body = res.json()
    expect(body.extraGuidePrice).toBe(400)
    expect(body.departureSlots[0].maxPax).toBe(24)
  })

  it('GET /tenants/:slug/packages/:id/slots: rascunho → 404; só datas além do corte de 24h', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    db.departureSlot.findMany.mockResolvedValue([])
    const res = await app.inject({ method: 'GET', url: '/tenants/agencia-a/packages/p1/slots' })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.findFirst.mock.calls[0][0].where).toMatchObject({
      id: 'p1',
      active: true,
      ...published,
    })
    const minStart = db.departureSlot.findMany.mock.calls[0][0].where.startsAt.gte as Date
    expect(minStart.getTime()).toBeGreaterThan(Date.now() + 23.9 * 3600_000)
  })

  it('GET /tenants/:slug/packages/:id/slots traz available e maxPax do modelo de grupo', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ ...pkg, extraGuidePrice: null })
    db.departureSlot.findMany.mockResolvedValue([
      { id: 's1', booked: 0, status: 'OPEN', minCapacity: 1, maxGuides: 3 },
    ])
    const res = await app.inject({ method: 'GET', url: '/tenants/agencia-a/packages/p1/slots' })
    expect(res.json()[0]).toMatchObject({ id: 's1', available: true, maxPax: 8 })
  })

  it('GET /destinations/:slug/packages', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'd1' })
    db.tourPackage.findMany.mockResolvedValue([])
    const res = await app.inject({ method: 'GET', url: '/destinations/serra/packages' })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.findMany.mock.calls[0][0].where).toMatchObject({
      active: true,
      ...published,
    })
  })

  it('GET /guides/:id/packages', async () => {
    db.packageGuide.findMany.mockResolvedValue([])
    const res = await app.inject({ method: 'GET', url: '/guides/g1/packages' })
    expect(res.statusCode).toBe(200)
    expect(db.packageGuide.findMany.mock.calls[0][0].where).toMatchObject({
      guideId: 'g1',
      status: 'ACCEPTED',
      package: { active: true, ...published },
    })
  })

  it('GET /packages/:id/guides → 404 para rascunho', async () => {
    db.tourPackage.findFirst.mockResolvedValue(null)
    const res = await app.inject({ method: 'GET', url: '/packages/p1/guides' })
    expect(res.statusCode).toBe(404)
    expect(db.tourPackage.findFirst.mock.calls[0][0].where).toMatchObject({
      id: 'p1',
      active: true,
      ...published,
    })
    expect(db.packageGuide.findMany).not.toHaveBeenCalled()
  })

  it('GET /packages/:id/guides devolve o userId (a página acha o condutor do roteiro)', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ id: 'p1' })
    db.packageGuide.findMany.mockResolvedValue([
      {
        guide: {
          id: 'gp1',
          bio: null,
          photoUrl: null,
          especialidades: [],
          regioes: [],
          user: { id: 'u1', name: 'Ana' },
        },
      },
    ])
    const res = await app.inject({ method: 'GET', url: '/packages/p1/guides' })
    expect(res.json()[0]).toMatchObject({ guideId: 'gp1', userId: 'u1', name: 'Ana' })
  })

  it('POST /packages/:id/guides/me → 404 Roteiro não encontrado para rascunho', async () => {
    const headers = auth('CONDUTOR', 'tenant-a', 'u9')
    db.user.findUnique.mockResolvedValue({
      role: 'CONDUTOR',
      name: 'G',
      approvalStatus: 'APPROVED',
      guideProfile: { id: 'gp1' },
    })
    db.tourPackage.findUnique.mockResolvedValue({
      id: 'p1',
      tenantId: 'tenant-a',
      conductorId: 'c1',
      active: true,
      publishedAt: null,
      tenant: { slug: 'x', name: 'X' },
      conductor: { name: 'C' },
    })
    const res = await app.inject({ method: 'POST', url: '/packages/p1/guides/me', headers })
    expect(res.statusCode).toBe(404)
    expect(res.json().message).toBe('Roteiro não encontrado')
  })
})

describe('GET /tenants/:slug/manage/packages', () => {
  const base = {
    ...pkg,
    description: 'd',
    price: '10',
    duration: 2,
    capacity: 5,
    difficulty: 'EASY',
    photos: [],
    highlights: [],
  }
  const rows = [
    { ...base, id: 'p1', name: 'A' },
    { ...base, id: 'p2', name: 'B', conductorId: 'outro', publishedAt: null },
    { ...base, id: 'p3', name: 'C', active: false },
  ]

  it('ADMIN do tenant vê todos, com status de rascunho e oculto', async () => {
    db.tourPackage.findMany.mockResolvedValue(rows)
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/agencia-a/manage/packages',
      headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().packages.map((p: any) => [p.id, p.status])).toEqual([
      ['p1', 'PUBLISHED'],
      ['p2', 'DRAFT'],
      ['p3', 'HIDDEN'],
    ])
  })

  it('CONDUTOR vê só os próprios roteiros', async () => {
    db.tourPackage.findMany.mockResolvedValue(rows)
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/agencia-a/manage/packages',
      headers: auth('CONDUTOR', 'tenant-a', 'cond-1'),
    })
    expect(res.json().packages.map((p: any) => p.id)).toEqual(['p1', 'p3'])
  })

  it('ADMIN de outra agência → 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/agencia-a/manage/packages',
      headers: auth('ADMIN', 'tenant-b'),
    })
    expect(res.statusCode).toBe(403)
  })

  it('sem token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/tenants/agencia-a/manage/packages' })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /tenants/:slug/packages/:id/assignable-guides', () => {
  const url = '/tenants/agencia-a/packages/p1/assignable-guides'

  it('ADMIN do dono lista os guias aceitos e aprovados, de qualquer tenant, inclusive em rascunho', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ ...pkg, publishedAt: null })
    db.packageGuide.findMany.mockResolvedValue([
      { guide: { id: 'gp-a', user: { name: 'Ana' } } },
      { guide: { id: 'gp-b', user: { name: 'Bia (outra associação)' } } },
    ])
    const res = await app.inject({ method: 'GET', url, headers: auth('ADMIN') })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      guides: [
        { guideId: 'gp-a', name: 'Ana' },
        { guideId: 'gp-b', name: 'Bia (outra associação)' },
      ],
    })
    expect(db.packageGuide.findMany.mock.calls[0][0].where).toEqual({
      packageId: 'p1',
      status: 'ACCEPTED',
      guide: { user: { approvalStatus: 'APPROVED' } },
    })
  })

  it('CONDUTOR que não é o condutor do roteiro → 403', async () => {
    db.tourPackage.findFirst.mockResolvedValue(pkg)
    const res = await app.inject({
      method: 'GET',
      url,
      headers: auth('CONDUTOR', 'tenant-a', 'outro'),
    })
    expect(res.statusCode).toBe(403)
    expect(db.packageGuide.findMany).not.toHaveBeenCalled()
  })

  it('roteiro de outro tenant → 404', async () => {
    db.tourPackage.findFirst.mockResolvedValue(null)
    const res = await app.inject({ method: 'GET', url, headers: auth('ADMIN') })
    expect(res.statusCode).toBe(404)
  })

  it('sem token → 401', async () => {
    const res = await app.inject({ method: 'GET', url })
    expect(res.statusCode).toBe(401)
  })
})

describe('aprovação: guia (CONDUTOR) em roteiro publicado', () => {
  const guide = () => auth('CONDUTOR', 'tenant-a', 'cond-1')
  const live = {
    ...pkg,
    name: 'Antigo',
    description: 'Desc',
    price: '500',
    extraGuidePrice: null,
    duration: 3,
  }
  const call = (method: string, url: string, payload?: unknown, headers = guide()) =>
    app.inject({
      method: method as any,
      url: `/tenants/agencia-a/packages/p1${url}`,
      headers,
      payload: payload as any,
    })

  const writtenKeys = () =>
    db.tourPackage.update.mock.calls.flatMap((c: any[]) => Object.keys(c[0].data))
  const PROTECTED = ['name', 'description', 'price', 'extraGuidePrice', 'publishedAt', 'active']

  it('PUT: só campos livres vão direto; importantes viram pedido UPDATE', async () => {
    db.tourPackage.findFirst.mockResolvedValue(live)
    db.tourPackage.update.mockResolvedValue({ ...live, duration: 5 })
    ;(submitRequest as any).mockResolvedValue({
      id: 'req-9',
      type: 'UPDATE',
      changes: { name: { from: 'Antigo', to: 'Novo' } },
    })
    const res = await call('PUT', '', { name: 'Novo', duration: 5 })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { duration: 5 },
    })
    expect(submitRequest).toHaveBeenCalledWith({
      packageId: 'p1',
      requestedById: 'cond-1',
      type: 'UPDATE',
      changes: { name: { from: 'Antigo', to: 'Novo' } },
    })
    expect(res.json().pendingRequest.id).toBe('req-9')
    expect(res.json().duration).toBe(5)
  })

  it('PUT com valores iguais aos atuais → sem pedido e pendingRequest null', async () => {
    db.tourPackage.findFirst.mockResolvedValue(live)
    db.tourPackage.findFirst.mockResolvedValue({ ...live, price: new Prisma.Decimal('500.00') })
    const res = await call('PUT', '', { name: 'Antigo', price: 500 })
    expect(res.statusCode).toBe(200)
    expect(submitRequest).not.toHaveBeenCalled()
    expect(db.tourPackage.update).not.toHaveBeenCalled()
    expect(res.json().pendingRequest).toBeNull()
  })

  it('PUT quando o merge esvazia o pedido → pendingRequest null', async () => {
    db.tourPackage.findFirst.mockResolvedValue(live)
    ;(submitRequest as any).mockResolvedValue(null)
    const res = await call('PUT', '', { name: 'Voltou' })
    expect(res.statusCode).toBe(200)
    expect(res.json().pendingRequest).toBeNull()
  })

  it('PUT em rascunho: aplica direto, sem pedido', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ ...live, publishedAt: null })
    db.tourPackage.update.mockResolvedValue({ ...live, price: 700 })
    const res = await call('PUT', '', { price: 700 })
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { price: 700 },
    })
    expect(submitRequest).not.toHaveBeenCalled()
    expect(res.json().pendingRequest).toBeNull()
  })

  it('unpublish e DELETE em publicado → 202, sem cancelar datas nem escrever', async () => {
    db.tourPackage.findFirst.mockResolvedValue(live)
    ;(submitRequest as any).mockResolvedValue({ id: 'req-2' })
    const un = await call('POST', '/unpublish')
    const del = await call('DELETE', '')
    expect(un.statusCode).toBe(202)
    expect(del.statusCode).toBe(202)
    expect(un.json().type).toBe('UNPUBLISH')
    expect(del.json().type).toBe('ARCHIVE')
    expect(cancelFutureSlots).not.toHaveBeenCalled()
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })

  it('PUT: submitRequest recusa com 409 → 409 e nenhum campo livre gravado', async () => {
    db.tourPackage.findFirst.mockResolvedValue(live)
    ;(submitRequest as any).mockRejectedValue(new AppError('Já existe um pedido pendente', 409))
    const res = await call('PUT', '', { name: 'Novo', duration: 5 })
    expect(res.statusCode).toBe(409)
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })

  it('PUT desfazendo campo pendente (name volta ao atual) → submitRequest recebe o campo', async () => {
    db.tourPackage.findFirst.mockResolvedValue(live)
    db.packageChangeRequest.findFirst.mockResolvedValue({
      changes: { name: { from: 'Antigo', to: 'Novo' } },
    })
    ;(submitRequest as any).mockResolvedValue(null)
    const res = await call('PUT', '', { name: 'Antigo' })
    expect(res.statusCode).toBe(200)
    expect(submitRequest).toHaveBeenCalledWith(
      expect.objectContaining({ changes: { name: { from: 'Antigo', to: 'Antigo' } } }),
    )
    expect(res.json().pendingRequest).toBeNull()
  })

  it('PUT só com campos livres e UPDATE pendente → não mexe no pedido', async () => {
    db.tourPackage.findFirst.mockResolvedValue(live)
    db.tourPackage.update.mockResolvedValue({ ...live, duration: 5 })
    db.packageChangeRequest.findFirst.mockResolvedValue({
      changes: { name: { from: 'Antigo', to: 'Novo' } },
    })
    const res = await call('PUT', '', { duration: 5, difficulty: 'HARD' })
    expect(res.statusCode).toBe(200)
    expect(submitRequest).not.toHaveBeenCalled()
    expect(db.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { duration: 5, difficulty: 'HARD' },
    })
  })

  it('unpublish de arquivado publicado pelo guia → direto, sem pedido', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ ...live, active: false })
    db.tourPackage.update.mockResolvedValue({})
    const res = await call('POST', '/unpublish')
    expect(res.statusCode).toBe(200)
    expect(submitRequest).not.toHaveBeenCalled()
    expect(db.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { publishedAt: null },
    })
  })

  it('DELETE em rascunho arquiva direto', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ ...live, publishedAt: null })
    db.tourPackage.update.mockResolvedValue({})
    const res = await call('DELETE', '')
    expect(res.statusCode).toBe(200)
    expect(submitRequest).not.toHaveBeenCalled()
    expect(db.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { active: false },
    })
  })

  it('restore de arquivado publicado → active true e publishedAt null', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ ...live, active: false })
    db.tourPackage.update.mockResolvedValue({})
    const res = await call('POST', '/restore')
    expect(res.statusCode).toBe(200)
    expect(db.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { active: true, publishedAt: null },
    })
    expect(res.json()).toEqual({ id: 'p1', active: true, publishedAt: null })
  })

  it('GUARDA: nenhuma rota do guia grava campo protegido em roteiro publicado e ativo', async () => {
    db.tourPackage.findFirst.mockResolvedValue(live)
    db.tourPackage.update.mockResolvedValue(live)
    await call('PUT', '', {
      name: 'X',
      description: 'Y',
      price: 1,
      extraGuidePrice: 2,
      duration: 4,
    })
    await call('PATCH', '', { photos: ['https://x.com/a.jpg'] })
    await call('POST', '/publish')
    await call('POST', '/unpublish')
    await call('POST', '/restore')
    await call('DELETE', '')
    expect(db.tourPackage.update).toHaveBeenCalledTimes(2)
    for (const key of writtenKeys()) expect(PROTECTED).not.toContain(key)
  })

  it('GET público segue com o preço antigo depois do PUT do guia', async () => {
    db.tourPackage.findFirst.mockResolvedValue(live)
    await call('PUT', '', { price: 700 })
    expect(db.tourPackage.update).not.toHaveBeenCalled()
    db.tourPackage.findFirst.mockResolvedValue({ ...live, departureSlots: [] })
    const res = await app.inject({ method: 'GET', url: '/tenants/agencia-a/packages/p1' })
    expect(res.statusCode).toBe(200)
    expect(Number(res.json().price)).toBe(500)
  })

  it('ADMIN: PUT importante e publish aplicam direto, sem pedido', async () => {
    db.tourPackage.findFirst.mockResolvedValue(live)
    db.tourPackage.update.mockResolvedValue(live)
    const put = await call('PUT', '', { name: 'Novo' }, auth('ADMIN'))
    expect(put.statusCode).toBe(200)
    expect(db.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { name: 'Novo' },
    })
    expect(put.json().pendingRequest).toBeNull()

    db.tourPackage.findFirst.mockResolvedValue({ ...live, publishedAt: null })
    const pub = await call('POST', '/publish', undefined, auth('ADMIN'))
    expect(pub.statusCode).toBe(200)
    expect(submitRequest).not.toHaveBeenCalled()
  })

  it('manage list inclui request do mapa', async () => {
    const request = {
      id: 'r1',
      type: 'PUBLISH',
      status: 'PENDING',
      rejectionReason: null,
      changes: null,
    }
    ;(latestRequestsByPackage as any).mockResolvedValue(new Map([['p1', request]]))
    db.tourPackage.findMany.mockResolvedValue([
      { ...live, capacity: 8, difficulty: 'EASY', photos: [], highlights: [] },
    ])
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/agencia-a/manage/packages',
      headers: guide(),
    })
    expect(res.json().packages[0].request).toEqual(request)
  })
})
