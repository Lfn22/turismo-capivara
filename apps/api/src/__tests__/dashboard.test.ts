import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from './helpers/build-app'
import { dashboardRoutes } from '../modules/dashboard/dashboard.routes'

vi.mock('../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    booking: { groupBy: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    departureSlot: { findMany: vi.fn() },
    guideProfile: { findUnique: vi.fn() },
  },
}))

import prisma from '../database'

const db = prisma as unknown as {
  tenant: { findUnique: Mock }
  booking: { groupBy: Mock; findMany: Mock; count: Mock }
  departureSlot: { findMany: Mock }
  guideProfile: { findUnique: Mock }
}

const app = buildApp(dashboardRoutes)

const TENANT = { id: 'tenant-1', slug: 'capivara' }

let adminToken: string

beforeAll(async () => {
  await app.ready()
  adminToken = app.jwt.sign({ sub: 'admin-1', role: 'ADMIN', tenantId: TENANT.id, name: 'Admin' })
})

afterAll(() => app.close())

beforeEach(() => {
  vi.clearAllMocks()
  db.tenant.findUnique.mockResolvedValue(TENANT)
  db.booking.groupBy.mockResolvedValue([])
  db.booking.findMany.mockResolvedValue([])
  db.booking.count.mockResolvedValue(0)
  db.departureSlot.findMany.mockResolvedValue([])
})

describe('GET /tenants/:slug/dashboard', () => {
  it('returns 401 without JWT', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/capivara/dashboard',
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 for unknown tenant', async () => {
    db.tenant.findUnique.mockResolvedValue(null)
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/tenant-nao-existe-xyz/dashboard',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns dashboard shape for valid tenant', async () => {
    db.booking.groupBy.mockResolvedValue([
      { status: 'PENDING', _count: { id: 3 } },
      { status: 'CONFIRMED', _count: { id: 2 } },
    ])
    db.booking.findMany.mockResolvedValue([{ pax: 2, slot: { package: { price: '100.00' } } }])
    db.departureSlot.findMany.mockResolvedValue([
      {
        id: 'slot-1',
        startsAt: new Date('2026-07-01'),
        booked: 1,
        capacity: 10,
        package: { name: 'Trilha' },
      },
    ])

    const res = await app.inject({
      method: 'GET',
      url: '/tenants/capivara/dashboard',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('bookings')
    expect(body).toHaveProperty('revenue')
    expect(body).toHaveProperty('upcomingSlots')
    expect(body.bookings.pending).toBe(3)
    expect(body.bookings.confirmed).toBe(2)
    expect(body.revenue.confirmed).toBe(200)
    expect(body.upcomingSlots).toHaveLength(1)
    expect(body.upcomingSlots[0].package.name).toBe('Trilha')
  })

  it('CONDUTOR vê só os números das próprias datas, não os do tenant inteiro', async () => {
    db.guideProfile.findUnique.mockResolvedValue({ id: 'gp1' })
    const token = app.jwt.sign({ sub: 'cond-1', role: 'CONDUTOR', tenantId: TENANT.id, name: 'G' })

    const res = await app.inject({
      method: 'GET',
      url: '/tenants/capivara/dashboard',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    const own = [{ guideId: 'gp1' }, { package: { conductorId: 'cond-1' } }]
    expect(db.booking.groupBy.mock.calls[0][0].where).toEqual({
      tenantId: TENANT.id,
      OR: own.map((slot) => ({ slot })),
    })
    expect(db.booking.findMany.mock.calls[0][0].where).toMatchObject({
      OR: own.map((slot) => ({ slot })),
    })
    expect(db.departureSlot.findMany.mock.calls[0][0].where).toMatchObject({ OR: own })
  })

  it('ADMIN continua vendo o tenant inteiro', async () => {
    await app.inject({
      method: 'GET',
      url: '/tenants/capivara/dashboard',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(db.booking.groupBy.mock.calls[0][0].where).toEqual({ tenantId: TENANT.id })
  })

  it('conta as reservas com passeio HOJE (São Paulo) e o total, no banco', async () => {
    db.booking.groupBy.mockResolvedValue([
      { status: 'PENDING', _count: { id: 30 } },
      { status: 'CONFIRMED', _count: { id: 12 } },
    ])
    db.booking.count.mockResolvedValue(4)

    const res = await app.inject({
      method: 'GET',
      url: '/tenants/capivara/dashboard',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.json().bookings).toMatchObject({ today: 4, total: 42 })
    const where = db.booking.count.mock.calls[0][0].where
    expect(where.status).toEqual({ in: ['PENDING', 'CONFIRMED'] })
    expect(where.slot.startsAt.gte).toBeInstanceOf(Date)
  })
})
