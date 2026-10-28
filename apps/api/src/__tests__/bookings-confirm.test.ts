import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from './helpers/build-app'
import { bookingsRoutes } from '../modules/bookings/bookings.routes'

vi.mock('../modules/notifications/booking-events', () => ({
  notifyBookingEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../services/payment.service', () => ({
  createPixPayment: vi.fn(),
}))

vi.mock('../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    booking: { findFirst: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
  },
}))

import prisma from '../database'
import { notifyBookingEvent } from '../modules/notifications/booking-events'

const db = prisma as unknown as {
  tenant: { findUnique: Mock }
  booking: { findFirst: Mock; updateMany: Mock; findUniqueOrThrow: Mock }
}

const app = buildApp(bookingsRoutes)
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
})

function confirm() {
  return app.inject({
    method: 'PATCH',
    url: '/tenants/capivara/bookings/b1/confirm',
    headers: { authorization: `Bearer ${adminToken}` },
  })
}

describe('PATCH /tenants/:slug/bookings/:id/confirm', () => {
  it('PENDING → confirma com updateMany guardado e notifica', async () => {
    db.booking.findFirst.mockResolvedValue({ id: 'b1', tenantId: TENANT.id, status: 'PENDING', slot: null })
    db.booking.updateMany.mockResolvedValue({ count: 1 })
    db.booking.findUniqueOrThrow.mockResolvedValue({
      id: 'b1', status: 'CONFIRMED', customerCpfHash: 'h', customerPhone: '1',
    })

    const res = await confirm()

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ id: 'b1', status: 'CONFIRMED' })
    expect(db.booking.updateMany).toHaveBeenCalledWith({
      where: { id: 'b1', status: 'PENDING' },
      data: { status: 'CONFIRMED' },
    })
    expect(notifyBookingEvent).toHaveBeenCalledWith(expect.anything(), 'b1', 'confirmed')
  })

  it('confirmada concorrentemente (count 0) → 400 e sem notificação', async () => {
    db.booking.findFirst.mockResolvedValue({ id: 'b1', tenantId: TENANT.id, status: 'PENDING', slot: null })
    db.booking.updateMany.mockResolvedValue({ count: 0 })

    const res = await confirm()

    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('Apenas reservas pendentes podem ser confirmadas')
    expect(notifyBookingEvent).not.toHaveBeenCalled()
  })

  it('não PENDING → 400 sem tentar atualizar', async () => {
    db.booking.findFirst.mockResolvedValue({ id: 'b1', tenantId: TENANT.id, status: 'CONFIRMED', slot: null })
    const res = await confirm()
    expect(res.statusCode).toBe(400)
    expect(db.booking.updateMany).not.toHaveBeenCalled()
    expect(notifyBookingEvent).not.toHaveBeenCalled()
  })
})
