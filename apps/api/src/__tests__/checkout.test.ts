/**
 * checkout.test.ts
 *
 * Integration tests for POST /tenants/:slug/bookings
 *  [1] 400 when required fields are missing
 *  [2] 400 when CPF format is invalid
 *  [3] 400 when slot is full (booked + pax > capacity)
 *  [4] 201 happy path — pax=3, price=150, amount=450, returns qrCode
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'

// hashCpf requires CPF_SECRET — set before any import that triggers the module
process.env.CPF_SECRET = 'test-cpf-secret-for-tests'

import { buildApp } from './helpers/build-app'
import { bookingsRoutes } from '../modules/bookings/bookings.routes'

// ---------------------------------------------------------------------------
// Mocks — declared before any import that uses these modules
// ---------------------------------------------------------------------------
vi.mock('../services/payment.service', () => ({
  createPixPayment: vi.fn(),
}))

vi.mock('../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    booking: { findUnique: vi.fn(), update: vi.fn() },
    departureSlot: { update: vi.fn() },
    tourPackage: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('../shared/email', () => ({
  getResend: vi.fn(() => null),
}))

vi.mock('../shared/utils/hash', () => ({
  hashCpf: vi.fn(() => 'hashed-cpf'),
}))

import prisma from '../database'
import { createPixPayment } from '../services/payment.service'

const db = prisma as unknown as {
  tenant: { findUnique: Mock }
  booking: { findUnique: Mock; update: Mock }
  departureSlot: { update: Mock }
  tourPackage: { findFirst: Mock }
  $transaction: Mock
}

const mockCreatePixPayment = createPixPayment as Mock

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = buildApp(bookingsRoutes)

const TENANT = { id: 'tenant-1', slug: 'capivara', approvalStatus: 'APPROVED' }

const VALID_BODY = {
  slotId: 'slot-1',
  customerName: 'João Silva',
  customerEmail: 'joao@example.com',
  customerPhone: '11999999999',
  customerCpf: '52998224725',
  pax: 3,
}

const CREATED_BOOKING = {
  id: 'booking-1',
  tenantId: TENANT.id,
  slotId: 'slot-1',
  customerName: 'João Silva',
  customerEmail: 'joao@example.com',
  pax: 3,
  status: 'PENDING',
  paymentId: null,
  paymentUrl: null,
  qrCode: null,
  expiresAt: new Date(),
  createdAt: new Date(),
  idempotencyKey: null,
}

beforeAll(() => app.ready())
afterAll(() => app.close())

beforeEach(() => {
  vi.clearAllMocks()
  db.tenant.findUnique.mockResolvedValue(TENANT)
  // No idempotency key by default — return null for findUnique
  db.booking.findUnique.mockResolvedValue(null)
})

// ---------------------------------------------------------------------------
// [1] Missing required fields
// ---------------------------------------------------------------------------
describe('POST /bookings — validation', () => {
  it('returns 400 when slotId is missing', async () => {
    const { slotId: _omit, ...bodyWithoutSlotId } = VALID_BODY

    const res = await app.inject({
      method: 'POST',
      url: `/tenants/${TENANT.slug}/bookings`,
      payload: bodyWithoutSlotId,
    })

    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.message).toBe('Dados inválidos')
    expect(Array.isArray(body.errors)).toBe(true)
    expect(body.errors.length).toBeGreaterThan(0)
  })

  // ---------------------------------------------------------------------------
  // [2] Invalid CPF format
  // ---------------------------------------------------------------------------
  it('returns 400 when customerCpf has fewer than 11 digits', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenants/${TENANT.slug}/bookings`,
      payload: { ...VALID_BODY, customerCpf: '123' },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.message).toBe('Dados inválidos')
    expect(Array.isArray(body.errors)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// [3] Slot is full
// ---------------------------------------------------------------------------
describe('POST /bookings — capacity check', () => {
  it('returns 400 when slot is full (booked + pax > capacity)', async () => {
    db.$transaction.mockImplementation(async (fn: Function) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([{
          id: 'slot-1',
          booked: 10,
          capacity: 10,
          status: 'OPEN',
          packageId: 'pkg-1',
          tenantId: TENANT.id,
        }]),
        departureSlot: { update: vi.fn().mockResolvedValue({}) },
        booking: { create: vi.fn().mockResolvedValue(CREATED_BOOKING) },
      }
      return fn(tx)
    })

    const res = await app.inject({
      method: 'POST',
      url: `/tenants/${TENANT.slug}/bookings`,
      payload: { ...VALID_BODY, pax: 1 },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.message).toMatch(/Capacidade/i)
  })
})

// ---------------------------------------------------------------------------
// [4] Happy path — 201 with qrCode, amount = price × pax
// ---------------------------------------------------------------------------
describe('POST /bookings — happy path', () => {
  it('returns 201 with qrCode and calls createPixPayment with correct amount', async () => {
    const createdBooking = { ...CREATED_BOOKING }

    db.$transaction.mockImplementation(async (fn: Function) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([{
          id: 'slot-1',
          booked: 2,
          capacity: 10,
          status: 'OPEN',
          packageId: 'pkg-1',
          tenantId: TENANT.id,
        }]),
        departureSlot: { update: vi.fn().mockResolvedValue({}) },
        booking: { create: vi.fn().mockResolvedValue(createdBooking) },
      }
      return fn(tx)
    })

    db.tourPackage.findFirst.mockResolvedValue({ price: '150.00', name: 'Trilha' })

    mockCreatePixPayment.mockResolvedValue({
      paymentId: 'mp-1',
      paymentUrl: 'https://mp.com/1',
      qrCode: 'qr-data',
    })

    db.booking.update.mockResolvedValue({
      ...createdBooking,
      paymentId: 'mp-1',
      paymentUrl: 'https://mp.com/1',
      qrCode: 'qr-data',
    })

    const res = await app.inject({
      method: 'POST',
      url: `/tenants/${TENANT.slug}/bookings`,
      payload: VALID_BODY,
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.qrCode).toBe('qr-data')

    expect(mockCreatePixPayment).toHaveBeenCalledOnce()
    const callArgs = mockCreatePixPayment.mock.calls[0][0]
    expect(callArgs.transactionAmount).toBe(450) // 150 * 3
  })
})
