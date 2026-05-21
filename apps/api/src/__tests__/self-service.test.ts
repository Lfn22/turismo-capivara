/**
 * self-service.test.ts
 *
 * Tests for public self-service endpoints (no JWT required):
 *  POST /tenants/:slug/bookings/lookup
 *  POST /tenants/:slug/bookings/cancel-self
 *  POST /tenants/:slug/bookings/repay
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from './helpers/build-app'
import { bookingsRoutes } from '../modules/bookings/bookings.routes'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('../services/payment.service', () => ({
  createPixPayment: vi.fn(),
}))

vi.mock('../shared/email', () => ({
  getResend: vi.fn(() => null),
}))

vi.mock('../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    booking: { findFirst: vi.fn(), update: vi.fn() },
    departureSlot: { findUnique: vi.fn(), update: vi.fn() },
    tourPackage: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import prisma from '../database'
import * as paymentService from '../services/payment.service'

const db = prisma as unknown as {
  tenant: { findUnique: Mock }
  booking: { findFirst: Mock; update: Mock }
  departureSlot: { findUnique: Mock; update: Mock }
  $transaction: Mock
}

const mockCreatePixPayment = paymentService.createPixPayment as Mock

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = buildApp(bookingsRoutes)

const TENANT = { id: 'tenant-1', slug: 'capivara', whatsapp: '+5511999999999' }

const FUTURE_DATE = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h from now

const BASE_BOOKING = {
  id: 'abc-def-ab1234',
  status: 'PENDING' as const,
  customerName: 'João Turista',
  customerEmail: 'joao@example.com',
  pax: 2,
  totalPrice: 200,
  qrCode: 'qr-code-data',
  paymentUrl: 'https://mp.com/pay/123',
  expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  slotId: 'slot-1',
  tenantId: TENANT.id,
  slot: {
    startsAt: FUTURE_DATE,
    package: { name: 'Trilha do Sol', description: 'Lindo passeio', price: 100 },
  },
}

beforeAll(() => app.ready())
afterAll(() => app.close())

beforeEach(() => {
  vi.clearAllMocks()
  db.tenant.findUnique.mockResolvedValue(TENANT)
})

// ---------------------------------------------------------------------------
// POST /lookup
// ---------------------------------------------------------------------------
describe('POST /tenants/:slug/bookings/lookup', () => {
  it('returns booking data for valid email + code', async () => {
    db.booking.findFirst.mockResolvedValue(BASE_BOOKING)

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/lookup',
      payload: { email: 'joao@example.com', code: 'ab1234' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe('abc-def-ab1234')
    expect(body.status).toBe('PENDING')
    expect(body.tenantWhatsapp).toBe('+5511999999999')
    expect(body.slot.packageName).toBe('Trilha do Sol')
  })

  it('returns 404 for wrong email (opaque error)', async () => {
    db.booking.findFirst.mockResolvedValue(BASE_BOOKING)

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/lookup',
      payload: { email: 'wrong@example.com', code: 'ab1234' },
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 404 when booking not found', async () => {
    db.booking.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/lookup',
      payload: { email: 'joao@example.com', code: 'zz9999' },
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 400 for missing fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/lookup',
      payload: { email: 'joao@example.com' },
    })

    expect(res.statusCode).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// POST /cancel-self
// ---------------------------------------------------------------------------
describe('POST /tenants/:slug/bookings/cancel-self', () => {
  it('cancels booking and releases slot when >24h before start', async () => {
    db.booking.findFirst.mockResolvedValue(BASE_BOOKING)
    db.$transaction.mockImplementation(async (fn: Function) => fn(db))
    db.booking.update.mockResolvedValue({ ...BASE_BOOKING, status: 'CANCELLED' })
    db.departureSlot.update.mockResolvedValue({})

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/cancel-self',
      payload: { email: 'joao@example.com', code: 'ab1234' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().message).toMatch(/cancelada/i)
  })

  it('returns 422 when booking starts in less than 24h', async () => {
    const nearBooking = {
      ...BASE_BOOKING,
      slot: { ...BASE_BOOKING.slot, startsAt: new Date(Date.now() + 12 * 60 * 60 * 1000) },
    }
    db.booking.findFirst.mockResolvedValue(nearBooking)

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/cancel-self',
      payload: { email: 'joao@example.com', code: 'ab1234' },
    })

    expect(res.statusCode).toBe(422)
  })

  it('returns 422 for already CANCELLED booking', async () => {
    db.booking.findFirst.mockResolvedValue({ ...BASE_BOOKING, status: 'CANCELLED' })

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/cancel-self',
      payload: { email: 'joao@example.com', code: 'ab1234' },
    })

    expect(res.statusCode).toBe(422)
  })

  it('returns 404 for email mismatch (opaque error)', async () => {
    db.booking.findFirst.mockResolvedValue(BASE_BOOKING)

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/cancel-self',
      payload: { email: 'outro@example.com', code: 'ab1234' },
    })

    expect(res.statusCode).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// POST /repay
// ---------------------------------------------------------------------------
describe('POST /tenants/:slug/bookings/repay', () => {
  it('creates new PIX payment and resets EXPIRED booking to PENDING', async () => {
    const expiredBooking = { ...BASE_BOOKING, status: 'EXPIRED', qrCode: null, paymentUrl: null }
    db.booking.findFirst.mockResolvedValue(expiredBooking)
    mockCreatePixPayment.mockResolvedValue({
      paymentId: 'mp-999',
      paymentUrl: 'https://mp.com/pay/999',
      qrCode: 'new-qr-data',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    })
    db.booking.update.mockResolvedValue({})

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/repay',
      payload: { email: 'joao@example.com', code: 'ab1234' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.qrCode).toBe('new-qr-data')
    expect(body.paymentUrl).toBe('https://mp.com/pay/999')
  })

  it('returns 422 for non-EXPIRED booking', async () => {
    db.booking.findFirst.mockResolvedValue(BASE_BOOKING) // status PENDING

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/repay',
      payload: { email: 'joao@example.com', code: 'ab1234' },
    })

    expect(res.statusCode).toBe(422)
  })

  it('returns 404 for email mismatch', async () => {
    const expiredBooking = { ...BASE_BOOKING, status: 'EXPIRED' }
    db.booking.findFirst.mockResolvedValue(expiredBooking)

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/repay',
      payload: { email: 'hacker@example.com', code: 'ab1234' },
    })

    expect(res.statusCode).toBe(404)
  })
})
