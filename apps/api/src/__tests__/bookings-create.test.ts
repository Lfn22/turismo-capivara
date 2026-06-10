/**
 * bookings-create.test.ts
 *
 * Testes de integração para POST /tenants/:slug/bookings
 * Cobre: happy path, idempotência, slot inválido, capacidade, falha de pagamento + compensação
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'

// hashCpf requires CPF_SECRET — set before any import that triggers the module
process.env.CPF_SECRET = 'test-cpf-secret-for-tests'
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
    booking: { findUnique: vi.fn(), update: vi.fn() },
    departureSlot: { update: vi.fn() },
    tourPackage: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import prisma from '../database'
import * as paymentService from '../services/payment.service'

const db = prisma as unknown as {
  tenant: { findUnique: Mock }
  booking: { findUnique: Mock; update: Mock }
  departureSlot: { update: Mock }
  tourPackage: { findFirst: Mock }
  $transaction: Mock
}

const mockCreatePixPayment = paymentService.createPixPayment as Mock

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const TENANT = { id: 'tenant-1', slug: 'capivara' }
const SLOT_ID = 'slot-1'
const FUTURE_DATE = new Date(Date.now() + 48 * 60 * 60 * 1000)

const OPEN_SLOT = {
  id: SLOT_ID,
  booked: 0,
  capacity: 5,
  status: 'OPEN',
  packageId: 'pkg-1',
  tenantId: TENANT.id,
}

const BOOKING_PENDING = {
  id: 'booking-abc',
  tenantId: TENANT.id,
  slotId: SLOT_ID,
  customerName: 'João Turista',
  customerEmail: 'joao@example.com',
  customerPhone: '11999999999',
  customerCpfHash: 'hash',
  pax: 2,
  status: 'PENDING',
  expiresAt: FUTURE_DATE,
  createdAt: new Date(),
  idempotencyKey: null,
  paymentId: null,
  paymentUrl: null,
  qrCode: null,
}

const PKG = {
  price: '150.00',
  name: 'Trilha da Pedra Furada',
  conductor: null,
  departureSlots: [{ startsAt: FUTURE_DATE }],
}

const PAYMENT_RESULT = {
  paymentId: 'mp-123',
  paymentUrl: 'https://payment.url/mp-123',
  qrCode: 'pix-qr-code-string',
}

const BOOKING_WITH_PAYMENT = {
  ...BOOKING_PENDING,
  paymentId: PAYMENT_RESULT.paymentId,
  paymentUrl: PAYMENT_RESULT.paymentUrl,
  qrCode: PAYMENT_RESULT.qrCode,
}

const VALID_BODY = {
  slotId: SLOT_ID,
  customerName: 'João Turista',
  customerEmail: 'joao@example.com',
  customerPhone: '11999999999',
  customerCpf: '12345678901',
  pax: 2,
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = buildApp(bookingsRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())

beforeEach(() => {
  vi.clearAllMocks()
  db.tenant.findUnique.mockResolvedValue(TENANT)
  db.booking.findUnique.mockResolvedValue(null) // sem idempotência por padrão
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockCreateTransaction() {
  db.$transaction.mockImplementation(async (fn: Function) => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([OPEN_SLOT]),
      departureSlot: { update: vi.fn().mockResolvedValue({}) },
      booking: { create: vi.fn().mockResolvedValue(BOOKING_PENDING) },
    }
    return fn(tx)
  })
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('POST /tenants/:slug/bookings', () => {
  describe('happy path', () => {
    it('retorna 201 com dados de pagamento PIX', async () => {
      mockCreateTransaction()
      db.tourPackage.findFirst.mockResolvedValue(PKG)
      mockCreatePixPayment.mockResolvedValue(PAYMENT_RESULT)
      db.booking.update.mockResolvedValue(BOOKING_WITH_PAYMENT)

      const res = await app.inject({
        method: 'POST',
        url: `/tenants/${TENANT.slug}/bookings`,
        payload: VALID_BODY,
      })

      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body.id).toBe(BOOKING_WITH_PAYMENT.id)
      expect(body.paymentId).toBe(PAYMENT_RESULT.paymentId)
      expect(body.qrCode).toBe(PAYMENT_RESULT.qrCode)
      expect(body.status).toBe('PENDING')
    })

    it('não expõe customerCpfHash nem customerPhone na resposta', async () => {
      mockCreateTransaction()
      db.tourPackage.findFirst.mockResolvedValue(PKG)
      mockCreatePixPayment.mockResolvedValue(PAYMENT_RESULT)
      db.booking.update.mockResolvedValue(BOOKING_WITH_PAYMENT)

      const res = await app.inject({
        method: 'POST',
        url: `/tenants/${TENANT.slug}/bookings`,
        payload: VALID_BODY,
      })

      const body = res.json()
      expect(body).not.toHaveProperty('customerCpfHash')
      expect(body).not.toHaveProperty('customerPhone')
    })
  })

  describe('idempotência', () => {
    it('retorna 200 com booking existente quando Idempotency-Key já foi usada', async () => {
      db.booking.findUnique.mockResolvedValue({
        ...BOOKING_WITH_PAYMENT,
        idempotencyKey: 'chave-unica-123',
      })

      const res = await app.inject({
        method: 'POST',
        url: `/tenants/${TENANT.slug}/bookings`,
        headers: { 'Idempotency-Key': 'chave-unica-123' },
        payload: VALID_BODY,
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().id).toBe(BOOKING_WITH_PAYMENT.id)
      expect(mockCreatePixPayment).not.toHaveBeenCalled()
    })
  })

  describe('erros de validação', () => {
    it('retorna 404 quando tenant não existe', async () => {
      db.tenant.findUnique.mockResolvedValue(null)

      const res = await app.inject({
        method: 'POST',
        url: '/tenants/inexistente/bookings',
        payload: VALID_BODY,
      })

      expect(res.statusCode).toBe(404)
    })

    it('retorna 404 quando slot não existe', async () => {
      db.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([]), // slot não encontrado
          departureSlot: { update: vi.fn() },
          booking: { create: vi.fn() },
        }
        return fn(tx)
      })

      const res = await app.inject({
        method: 'POST',
        url: `/tenants/${TENANT.slug}/bookings`,
        payload: VALID_BODY,
      })

      expect(res.statusCode).toBe(404)
    })

    it('retorna 400 quando slot não está OPEN', async () => {
      db.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([{ ...OPEN_SLOT, status: 'FULL' }]),
          departureSlot: { update: vi.fn() },
          booking: { create: vi.fn() },
        }
        return fn(tx)
      })

      const res = await app.inject({
        method: 'POST',
        url: `/tenants/${TENANT.slug}/bookings`,
        payload: VALID_BODY,
      })

      expect(res.statusCode).toBe(400)
    })

    it('retorna 400 quando capacidade é insuficiente', async () => {
      db.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([{ ...OPEN_SLOT, booked: 4, capacity: 5 }]),
          departureSlot: { update: vi.fn() },
          booking: { create: vi.fn() },
        }
        return fn(tx)
      })

      const res = await app.inject({
        method: 'POST',
        url: `/tenants/${TENANT.slug}/bookings`,
        payload: { ...VALID_BODY, pax: 3 }, // 4 + 3 > 5
      })

      expect(res.statusCode).toBe(400)
    })
  })

  describe('falha no pagamento + compensação', () => {
    it('executa transação de compensação e retorna 5xx quando createPixPayment falha', async () => {
      // Primeira transação: cria booking
      const mockCompensationDelete = vi.fn().mockResolvedValue({})
      const mockCompensationSlotUpdate = vi.fn().mockResolvedValue({})

      db.$transaction
        .mockImplementationOnce(async (fn: Function) => {
          const tx = {
            $queryRaw: vi.fn().mockResolvedValue([OPEN_SLOT]),
            departureSlot: { update: vi.fn().mockResolvedValue({}) },
            booking: { create: vi.fn().mockResolvedValue(BOOKING_PENDING) },
          }
          return fn(tx)
        })
        .mockImplementationOnce(async (fn: Function) => {
          // Segunda transação: compensação
          const tx = {
            booking: { delete: mockCompensationDelete },
            departureSlot: {
              findUnique: vi.fn().mockResolvedValue({ status: 'OPEN' }),
              update: mockCompensationSlotUpdate,
            },
          }
          return fn(tx)
        })

      db.tourPackage.findFirst.mockResolvedValue(PKG)
      mockCreatePixPayment.mockRejectedValue(new Error('Mercado Pago offline'))

      const res = await app.inject({
        method: 'POST',
        url: `/tenants/${TENANT.slug}/bookings`,
        payload: VALID_BODY,
      })

      expect(res.statusCode).toBeGreaterThanOrEqual(500)
      expect(mockCompensationDelete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: BOOKING_PENDING.id } })
      )
      expect(mockCompensationSlotUpdate).toHaveBeenCalled()
    })
  })
})
