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
  cancelPixPayment: vi.fn().mockResolvedValue(undefined),
  refundPayment: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../shared/email', () => ({
  getResend: vi.fn(() => null),
}))

vi.mock('../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    booking: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    departureSlot: { findUnique: vi.fn(), update: vi.fn() },
    tourPackage: { findFirst: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
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
  // Fora dos 7 dias de arrependimento (CDC Art.49): vale o cutoff de 24h antes da partida
  createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
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
// POST /cancel-self — agora usa { token } (cancelToken opaco) em vez de { email, code }
// ---------------------------------------------------------------------------
describe('POST /tenants/:slug/bookings/cancel-self', () => {
  it('cancels booking and releases slot when >24h before start', async () => {
    db.booking.findFirst.mockResolvedValue(BASE_BOOKING)
    db.booking.update.mockResolvedValue({ ...BASE_BOOKING, status: 'CANCELLED' })
    db.departureSlot.update.mockResolvedValue({})
    db.$transaction.mockImplementation(async (fn: Function) => {
      const tx = {
        ...db,
        $queryRaw: vi.fn().mockResolvedValue([{ booked: 2, status: 'OPEN', capacity: 10 }]),
      }
      return fn(tx)
    })

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/cancel-self',
      payload: { token: 'abc123opaque64hextoken' },
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
      payload: { token: 'abc123opaque64hextoken' },
    })

    expect(res.statusCode).toBe(422)
  })

  it('returns 422 for already CANCELLED booking', async () => {
    db.booking.findFirst.mockResolvedValue({ ...BASE_BOOKING, status: 'CANCELLED' })

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/cancel-self',
      payload: { token: 'abc123opaque64hextoken' },
    })

    expect(res.statusCode).toBe(422)
  })

  it('returns 404 when token does not match any booking (SEC-02)', async () => {
    db.booking.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/cancel-self',
      payload: { token: 'token-inexistente' },
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 400 when token field is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/cancel-self',
      payload: {},
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 422 within the CDC 7-day window when the tour already started', async () => {
    db.booking.findFirst.mockResolvedValue({
      ...BASE_BOOKING,
      status: 'CONFIRMED',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // comprou ontem (CDC)
      slot: { ...BASE_BOOKING.slot, startsAt: new Date(Date.now() - 60 * 60 * 1000) }, // já saiu
    })

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/cancel-self',
      payload: { token: 'abc123opaque64hextoken' },
    })

    expect(res.statusCode).toBe(422)
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  // Tela "Minha reserva": o turista se identifica por e-mail + código de 6 caracteres
  it('cancels by email + code (Minha reserva)', async () => {
    db.booking.findFirst.mockResolvedValue(BASE_BOOKING)
    db.booking.update.mockResolvedValue({ ...BASE_BOOKING, status: 'CANCELLED' })
    db.$transaction.mockImplementation(async (fn: Function) =>
      fn({
        ...db,
        $queryRaw: vi.fn().mockResolvedValue([{ booked: 2, status: 'OPEN', capacity: 10 }]),
      }),
    )

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/cancel-self',
      payload: { email: 'JOAO@example.com', code: 'AB1234' },
    })

    expect(res.statusCode).toBe(200)
    expect(db.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: 'ab1234', tenantId: TENANT.id } }),
    )
  })

  it('returns opaque 404 when email does not match the code', async () => {
    db.booking.findFirst.mockResolvedValue(BASE_BOOKING)

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/cancel-self',
      payload: { email: 'outro@example.com', code: 'ab1234' },
    })

    expect(res.statusCode).toBe(404)
    expect(db.$transaction).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// POST /repay
// ---------------------------------------------------------------------------
describe('POST /tenants/:slug/bookings/repay', () => {
  const VALID_CPF = '52998224725'
  const PUBLISHED_OPEN_SLOT = { status: 'OPEN', package: { active: true, publishedAt: new Date() } }

  it('creates new PIX payment and resets EXPIRED booking to PENDING', async () => {
    const expiredBooking = { ...BASE_BOOKING, status: 'EXPIRED', qrCode: null, paymentUrl: null }
    db.booking.findFirst.mockResolvedValue(expiredBooking)
    db.departureSlot.findUnique.mockResolvedValue(PUBLISHED_OPEN_SLOT)
    mockCreatePixPayment.mockResolvedValue({
      paymentId: 'mp-999',
      paymentUrl: 'https://mp.com/pay/999',
      qrCode: 'new-qr-data',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    })
    db.$transaction.mockImplementation(async (fn: Function) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([{ status: 'OPEN', booked: 0, capacity: 10 }]),
        departureSlot: { update: vi.fn().mockResolvedValue({}) },
        booking: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      }
      return fn(tx)
    })

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/repay',
      payload: { email: 'joao@example.com', code: 'ab1234', cpf: VALID_CPF },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.qrCode).toBe('new-qr-data')
    expect(body.paymentUrl).toBe('https://mp.com/pay/999')

    const input = mockCreatePixPayment.mock.calls[0][0]
    // PIX novo com o mesmo prazo de uma reserva nova (não as 24h de fallback do MP)
    expect(input.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(30 * 60_000 + 1000)
    // Chave de idempotência própria: reusar o bookingId devolveria a cobrança antiga
    expect(input.idempotencyKey).toBeDefined()
    expect(input.idempotencyKey).not.toBe(BASE_BOOKING.id)
  })

  it('repay concorrente: a reserva já saiu de EXPIRED → 409, cancela o PIX novo e não ocupa vaga', async () => {
    db.booking.findFirst.mockResolvedValue({ ...BASE_BOOKING, status: 'EXPIRED' })
    db.departureSlot.findUnique.mockResolvedValue(PUBLISHED_OPEN_SLOT)
    mockCreatePixPayment.mockResolvedValue({
      paymentId: 'mp-dup',
      paymentUrl: 'u',
      qrCode: 'q',
      expiresAt: new Date(),
    })
    const slotUpdate = vi.fn()
    db.$transaction.mockImplementation(async (fn: Function) =>
      fn({
        $queryRaw: vi.fn().mockResolvedValue([{ status: 'OPEN', booked: 0, capacity: 10 }]),
        departureSlot: { update: slotUpdate },
        booking: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      }),
    )

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/repay',
      payload: { email: 'joao@example.com', code: 'ab1234', cpf: VALID_CPF },
    })

    expect(res.statusCode).toBe(409)
    expect(slotUpdate).not.toHaveBeenCalled()
    expect(paymentService.cancelPixPayment).toHaveBeenCalledWith('mp-dup')
  })

  it('returns 400 without charging when less than 24h to the tour (corte de reserva)', async () => {
    db.booking.findFirst.mockResolvedValue({
      ...BASE_BOOKING,
      status: 'EXPIRED',
      slot: { ...BASE_BOOKING.slot, startsAt: new Date(Date.now() + 6 * 3600_000) },
    })
    db.departureSlot.findUnique.mockResolvedValue(PUBLISHED_OPEN_SLOT)

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/repay',
      payload: { email: 'joao@example.com', code: 'ab1234', cpf: VALID_CPF },
    })

    expect(res.statusCode).toBe(400)
    expect(mockCreatePixPayment).not.toHaveBeenCalled()
  })

  it.each([
    ['rascunho', { active: true, publishedAt: null }],
    ['arquivado', { active: false, publishedAt: new Date() }],
  ])('returns 422 without charging when the roteiro is %s', async (_label, pkg) => {
    db.booking.findFirst.mockResolvedValue({ ...BASE_BOOKING, status: 'EXPIRED' })
    db.departureSlot.findUnique.mockResolvedValue({ status: 'OPEN', package: pkg })

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/repay',
      payload: { email: 'joao@example.com', code: 'ab1234', cpf: VALID_CPF },
    })

    expect(res.statusCode).toBe(422)
    expect(mockCreatePixPayment).not.toHaveBeenCalled()
  })

  it('returns 422 for non-EXPIRED booking', async () => {
    db.booking.findFirst.mockResolvedValue(BASE_BOOKING) // status PENDING

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/repay',
      payload: { email: 'joao@example.com', code: 'ab1234', cpf: VALID_CPF },
    })

    expect(res.statusCode).toBe(422)
  })

  it('returns 404 for email mismatch', async () => {
    const expiredBooking = { ...BASE_BOOKING, status: 'EXPIRED' }
    db.booking.findFirst.mockResolvedValue(expiredBooking)

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/repay',
      payload: { email: 'hacker@example.com', code: 'ab1234', cpf: VALID_CPF },
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 400 without charging when CPF is missing', async () => {
    db.booking.findFirst.mockResolvedValue({ ...BASE_BOOKING, status: 'EXPIRED' })

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/bookings/repay',
      payload: { email: 'joao@example.com', code: 'ab1234' },
    })

    expect(res.statusCode).toBe(400)
    expect(mockCreatePixPayment).not.toHaveBeenCalled()
  })
})
