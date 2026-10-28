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
import { Prisma } from '@prisma/client'
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

vi.mock('../modules/notifications/booking-events', () => ({
  notifyBookingEvent: vi.fn().mockResolvedValue(undefined),
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
import { notifyBookingEvent } from '../modules/notifications/booking-events'

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
// approvalStatus é exigido pelo gate DATA-02 na rota — sem ele toda request vira 403
const TENANT = { id: 'tenant-1', slug: 'capivara', approvalStatus: 'APPROVED' }
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
  // Precisa passar em isValidCPF (dígitos verificadores), não só no regex de 11 dígitos.
  // '12345678901' era usado aqui e é inválido — toda request morria em 400 antes da rota.
  customerCpf: '11144477735',
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
let lastBookingCreate: Mock

function mockCreateTransaction() {
  db.$transaction.mockImplementation(async (fn: Function) => {
    lastBookingCreate = vi.fn().mockResolvedValue(BOOKING_PENDING)
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([OPEN_SLOT]),
      departureSlot: { update: vi.fn().mockResolvedValue({}) },
      booking: { create: lastBookingCreate },
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

  describe('userId opcional (JWT)', () => {
    async function post(headers: Record<string, string>) {
      mockCreateTransaction()
      db.tourPackage.findFirst.mockResolvedValue(PKG)
      mockCreatePixPayment.mockResolvedValue(PAYMENT_RESULT)
      db.booking.update.mockResolvedValue(BOOKING_WITH_PAYMENT)
      return app.inject({
        method: 'POST',
        url: `/tenants/${TENANT.slug}/bookings`,
        headers,
        payload: VALID_BODY,
      })
    }

    it('grava userId quando o token é de CLIENTE', async () => {
      const token = app.jwt.sign({ sub: 'c1', role: 'CLIENTE', tenantId: TENANT.id, name: 'Cli' })
      const res = await post({ authorization: `Bearer ${token}` })
      expect(res.statusCode).toBe(201)
      expect(lastBookingCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'c1' }) })
    })

    it('não grava userId para CONDUTOR', async () => {
      const token = app.jwt.sign({ sub: 'g1', role: 'CONDUTOR', tenantId: TENANT.id, name: 'Guia' })
      const res = await post({ authorization: `Bearer ${token}` })
      expect(res.statusCode).toBe(201)
      expect(lastBookingCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: null }) })
    })

    it('token inválido segue como guest (201, userId nulo)', async () => {
      const res = await post({ authorization: 'Bearer lixo' })
      expect(res.statusCode).toBe(201)
      expect(lastBookingCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: null }) })
    })

    it('falha na notificação não altera a resposta (201)', async () => {
      ;(notifyBookingEvent as Mock).mockRejectedValueOnce(new Error('db'))
      const res = await post({})
      expect(res.statusCode).toBe(201)
      expect(notifyBookingEvent).toHaveBeenCalledWith(expect.anything(), BOOKING_PENDING.id, 'created')
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
    it('libera a reserva e as vagas quando createPixPayment falha', async () => {
      const releaseBookingUpdate = vi.fn().mockResolvedValue({ count: 1 })
      const releaseSlotUpdate = vi.fn().mockResolvedValue({ count: 1 })

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
          const tx = {
            booking: { updateMany: releaseBookingUpdate },
            departureSlot: {
              findUnique: vi.fn().mockResolvedValue({ status: 'OPEN' }),
              updateMany: releaseSlotUpdate,
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
      // A reserva vira EXPIRED (só se ainda estiver PENDING) e as vagas voltam
      expect(releaseBookingUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: expect.any(String), status: 'PENDING' } })
      )
      expect(releaseSlotUpdate).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // C-2 / C-3 / A-4 — garantias do fluxo de criação
  // -------------------------------------------------------------------------
  describe('C-2: a reserva é persistida junto com a reserva de vagas', () => {
    it('cria o Booking na MESMA transação que incrementa o slot, antes de chamar o MP', async () => {
      const slotUpdate = vi.fn().mockResolvedValue({})
      const bookingCreate = vi.fn().mockResolvedValue(BOOKING_PENDING)

      db.$transaction.mockImplementation(async (fn: Function) =>
        fn({
          $queryRaw: vi.fn().mockResolvedValue([OPEN_SLOT]),
          departureSlot: { update: slotUpdate },
          booking: { create: bookingCreate },
        })
      )
      db.tourPackage.findFirst.mockResolvedValue(PKG)
      mockCreatePixPayment.mockResolvedValue(PAYMENT_RESULT)
      db.booking.update.mockResolvedValue(BOOKING_WITH_PAYMENT)

      await app.inject({
        method: 'POST',
        url: `/tenants/${TENANT.slug}/bookings`,
        payload: VALID_BODY,
      })

      // Ambos dentro da transação: vaga nunca fica presa sem uma linha que a libere
      expect(slotUpdate).toHaveBeenCalled()
      expect(bookingCreate).toHaveBeenCalled()
      // E o Booking já existe quando o MP é chamado
      expect(bookingCreate.mock.invocationCallOrder[0]).toBeLessThan(
        mockCreatePixPayment.mock.invocationCallOrder[0]
      )
    })

    it('A-4: expiresAt respeita BOOKING_EXPIRY_MINUTES em vez das 24h do MP', async () => {
      process.env.BOOKING_EXPIRY_MINUTES = '30'
      const bookingCreate = vi.fn().mockResolvedValue(BOOKING_PENDING)

      db.$transaction.mockImplementation(async (fn: Function) =>
        fn({
          $queryRaw: vi.fn().mockResolvedValue([OPEN_SLOT]),
          departureSlot: { update: vi.fn().mockResolvedValue({}) },
          booking: { create: bookingCreate },
        })
      )
      db.tourPackage.findFirst.mockResolvedValue(PKG)
      mockCreatePixPayment.mockResolvedValue(PAYMENT_RESULT)
      db.booking.update.mockResolvedValue(BOOKING_WITH_PAYMENT)

      const before = Date.now()
      await app.inject({
        method: 'POST',
        url: `/tenants/${TENANT.slug}/bookings`,
        payload: VALID_BODY,
      })

      const written = bookingCreate.mock.calls[0][0].data.expiresAt as Date
      const minutesAhead = (written.getTime() - before) / 60_000
      expect(minutesAhead).toBeGreaterThan(29)
      expect(minutesAhead).toBeLessThan(31)

      // E o MP recebe a MESMA janela, para o PIX não sobreviver à reserva
      expect(mockCreatePixPayment).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt: written })
      )
    })
  })

  describe('C-3: corrida de Idempotency-Key', () => {
    it('devolve a reserva vencedora sem criar uma segunda cobrança PIX', async () => {
      const winner = { ...BOOKING_WITH_PAYMENT, idempotencyKey: 'chave-concorrente' }

      // Fast path não encontra nada (as duas requisições chegaram juntas)...
      db.booking.findUnique.mockResolvedValueOnce(null)
      // ...a transação perde a corrida na constraint única...
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      })
      db.$transaction.mockRejectedValue(p2002)
      // ...e a releitura encontra a reserva da vencedora
      db.booking.findUnique.mockResolvedValueOnce(winner)

      const res = await app.inject({
        method: 'POST',
        url: `/tenants/${TENANT.slug}/bookings`,
        headers: { 'Idempotency-Key': 'chave-concorrente' },
        payload: VALID_BODY,
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().id).toBe(winner.id)
      // O ponto do C-3: nenhuma segunda cobrança é criada
      expect(mockCreatePixPayment).not.toHaveBeenCalled()
    })
  })
})
