import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from './helpers/build-app'
import { dashboardRoutes } from '../modules/dashboard/dashboard.routes'

vi.mock('../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    booking: { groupBy: vi.fn(), findMany: vi.fn() },
    departureSlot: { findMany: vi.fn() },
  },
}))

import prisma from '../database'

const db = prisma as unknown as {
  tenant: { findUnique: Mock }
  booking: { groupBy: Mock; findMany: Mock }
  departureSlot: { findMany: Mock }
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
    db.booking.findMany.mockResolvedValue([
      { pax: 2, slot: { package: { price: '100.00' } } },
    ])
    db.departureSlot.findMany.mockResolvedValue([
      { id: 'slot-1', startsAt: new Date('2026-07-01'), booked: 1, capacity: 10, package: { name: 'Trilha' } },
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
})
