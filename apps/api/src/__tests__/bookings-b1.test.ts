/**
 * bookings-b1.test.ts
 *
 * Regression tests for:
 *  [B1] Cancel booking on a manually-CANCELLED slot must NOT force status to OPEN.
 *  [Contract] Booking response strips PII (customerCpf, customerPhone).
 *  [Cross-tenant] authenticate blocks JWT tenantId mismatches.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from './helpers/build-app'
import { bookingsRoutes } from '../modules/bookings/bookings.routes'

// ---------------------------------------------------------------------------
// Mocks — must be declared before any import that uses these modules
// ---------------------------------------------------------------------------
vi.mock('../services/payment.service', () => ({
  createPixPayment: vi.fn(),
}))

vi.mock('../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    booking: { findFirst: vi.fn(), update: vi.fn(), count: vi.fn() },
    departureSlot: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import prisma from '../database'

const db = prisma as unknown as {
  tenant: { findUnique: Mock }
  booking: { findFirst: Mock; update: Mock; count: Mock }
  departureSlot: { findUnique: Mock; update: Mock }
  $transaction: Mock
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = buildApp(bookingsRoutes)

const TENANT = { id: 'tenant-1', slug: 'capivara' }

let adminToken: string
let crossTenantAdminToken: string

beforeAll(async () => {
  await app.ready()
  // Cancel route requires ADMIN or ATENDENTE
  adminToken = app.jwt.sign({ sub: 'admin-1', role: 'ADMIN', tenantId: TENANT.id, name: 'Admin' })
  crossTenantAdminToken = app.jwt.sign({ sub: 'admin-x', role: 'ADMIN', tenantId: 'other-tenant', name: 'Admin X' })
})

afterAll(() => app.close())

beforeEach(() => {
  vi.clearAllMocks()
  // Always resolve the URL slug to TENANT for authenticate cross-tenant check
  db.tenant.findUnique.mockResolvedValue(TENANT)
})

// ---------------------------------------------------------------------------
// [B1] Regression — cancel booking on manually-CANCELLED slot
// ---------------------------------------------------------------------------
describe('[B1] Booking cancel — slot status preservation', () => {
  it('preserves CANCELLED slot status when booking is cancelled on it', async () => {
    const cancelledSlot = { id: 'slot-1', status: 'CANCELLED', booked: 1, capacity: 5 }
    const confirmedBooking = {
      id: 'booking-1', slotId: 'slot-1', tenantId: TENANT.id, pax: 1, status: 'CONFIRMED',
      customerCpf: '111.111.111-11', customerPhone: '99999999999',
    }
    const updatedBooking = { ...confirmedBooking, status: 'CANCELLED' }

    db.booking.findFirst.mockResolvedValue(confirmedBooking)

    db.$transaction.mockImplementation(async (fn: Function) => {
      const tx = {
        departureSlot: {
          findUnique: vi.fn().mockResolvedValue(cancelledSlot),
          update: vi.fn().mockResolvedValue(cancelledSlot),
        },
        booking: {
          count: vi.fn().mockResolvedValue(0),
          update: vi.fn().mockResolvedValue(updatedBooking),
        },
      }
      const result = await fn(tx)

      // Assert: slot update must NOT include a `status` key when slot is CANCELLED
      const slotUpdate = tx.departureSlot.update.mock.calls[0][0]
      expect(slotUpdate.data).not.toHaveProperty('status')
      expect(slotUpdate.data.booked).toEqual({ decrement: 1 })

      return result
    })

    const res = await app.inject({
      method: 'PATCH',
      url: `/tenants/${TENANT.slug}/bookings/booking-1/cancel`,
      headers: { Authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
  })

  it('sets slot to OPEN when FULL slot has no remaining bookings after cancel', async () => {
    const fullSlot = { id: 'slot-2', status: 'FULL', booked: 1, capacity: 1 }
    const pendingBooking = {
      id: 'booking-2', slotId: 'slot-2', tenantId: TENANT.id, pax: 1, status: 'PENDING',
      customerCpf: null, customerPhone: '88888888888',
    }
    const cancelledBooking = { ...pendingBooking, status: 'CANCELLED' }

    db.booking.findFirst.mockResolvedValue(pendingBooking)

    db.$transaction.mockImplementation(async (fn: Function) => {
      const tx = {
        departureSlot: {
          findUnique: vi.fn().mockResolvedValue(fullSlot),
          update: vi.fn().mockResolvedValue({ ...fullSlot, status: 'OPEN' }),
        },
        booking: {
          count: vi.fn().mockResolvedValue(0),
          update: vi.fn().mockResolvedValue(cancelledBooking),
        },
      }
      const result = await fn(tx)

      // Assert: FULL slot should transition to OPEN
      const slotUpdate = tx.departureSlot.update.mock.calls[0][0]
      expect(slotUpdate.data.status).toBe('OPEN')

      return result
    })

    const res = await app.inject({
      method: 'PATCH',
      url: `/tenants/${TENANT.slug}/bookings/booking-2/cancel`,
      headers: { Authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// [Contract] Booking response strips PII
// ---------------------------------------------------------------------------
describe('[Contract] Booking cancel response shape', () => {
  it('response omits customerCpf and customerPhone', async () => {
    const booking = {
      id: 'booking-3', slotId: 'slot-3', tenantId: TENANT.id, pax: 2, status: 'PENDING',
      customerCpf: '123.456.789-00', customerPhone: '77777777777',
    }
    const cancelled = { id: 'booking-3', slotId: 'slot-3', tenantId: TENANT.id, pax: 2, status: 'CANCELLED' }

    db.booking.findFirst.mockResolvedValue(booking)
    db.$transaction.mockImplementation(async (fn: Function) => {
      const tx = {
        departureSlot: {
          findUnique: vi.fn().mockResolvedValue({ id: 'slot-3', status: 'OPEN', booked: 2, capacity: 10 }),
          update: vi.fn().mockResolvedValue({}),
        },
        booking: {
          count: vi.fn().mockResolvedValue(0),
          update: vi.fn().mockResolvedValue(cancelled),
        },
      }
      return fn(tx)
    })

    const res = await app.inject({
      method: 'PATCH',
      url: `/tenants/${TENANT.slug}/bookings/booking-3/cancel`,
      headers: { Authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<Record<string, unknown>>()
    expect(body).not.toHaveProperty('customerCpf')
    expect(body).not.toHaveProperty('customerPhone')
    expect(body.status).toBe('CANCELLED')
  })
})

// ---------------------------------------------------------------------------
// [Cross-tenant] authenticate middleware
// ---------------------------------------------------------------------------
describe('[Cross-tenant] authenticate — tenantId mismatch → 403', () => {
  it('rejects token whose tenantId does not match the URL slug', async () => {
    // Slug resolves to tenant-1, but token claims other-tenant
    const res = await app.inject({
      method: 'PATCH',
      url: `/tenants/${TENANT.slug}/bookings/booking-x/cancel`,
      headers: { Authorization: `Bearer ${crossTenantAdminToken}` },
    })
    expect(res.statusCode).toBe(403)
  })
})
