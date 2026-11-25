import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../notifications/booking-events', () => ({
  notifyBookingEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../database', () => ({
  default: {
    booking: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

// O lock é testado em shared/job-lock.test.ts; aqui só controlamos se foi obtido
const lockObtained = { value: true }
vi.mock('../../shared/job-lock', () => ({
  withAdvisoryXactLock: vi.fn(async (_id: number, fn: () => Promise<void>) => {
    if (!lockObtained.value) return false
    await fn()
    return true
  }),
}))

vi.mock('../../shared/email', () => ({
  getResend: vi.fn(),
  getEmailFrom: vi.fn(() => 'noreply@capi.app'),
}))

vi.mock('../../shared/metrics.js', () => ({
  bookingsExpiredCounter: { add: vi.fn() },
}))

import prisma from '../../database'
import { getResend } from '../../shared/email'
import { bookingsExpiredCounter } from '../../shared/metrics.js'
import { createBookingExpiryJob } from './expiry.job'
import { notifyBookingEvent } from '../notifications/booking-events'

const mockPrisma = prisma as any
const mockGetResend = getResend as ReturnType<typeof vi.fn>

function makeApp() {
  return { log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } } as any
}

function pendingBooking(over: Record<string, unknown> = {}) {
  return {
    id: 'bk-1',
    customerName: 'Ana',
    customerEmail: 'ana@example.com',
    pax: 2,
    slotId: 'slot-1',
    tenantId: 't1',
    slot: { package: { name: 'Passeio', tenant: { slug: 'my-tenant' } } },
    ...over,
  }
}

function makeTx(count: number, slot: Record<string, unknown> | null) {
  return {
    booking: { updateMany: vi.fn().mockResolvedValue({ count }) },
    departureSlot: { update: vi.fn() },
    $queryRaw: vi.fn().mockResolvedValue(slot ? [slot] : []),
  }
}

let tx: ReturnType<typeof makeTx>

beforeEach(() => {
  vi.clearAllMocks()
  lockObtained.value = true
  mockGetResend.mockReturnValue(null)
  tx = makeTx(1, { id: 'slot-1', booked: 4, capacity: 4, status: 'FULL' })
  mockPrisma.$transaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx))
})

describe('createBookingExpiryJob', () => {
  it('roda a cada 5 minutos (PIX vence em ~30 min; de hora em hora segurava vagas)', () => {
    expect(createBookingExpiryJob(makeApp()).cronTime).toBe('*/5 * * * *')
  })

  it('sem o lock (outra instância rodando) não lê nem escreve nada', async () => {
    lockObtained.value = false
    await createBookingExpiryJob(makeApp()).onTick()
    expect(mockPrisma.booking.findMany).not.toHaveBeenCalled()
  })

  it('expira a reserva e devolve a vaga com valor travado (FULL → OPEN)', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([pendingBooking()])

    await createBookingExpiryJob(makeApp()).onTick()

    expect(tx.booking.updateMany).toHaveBeenCalledWith({
      where: { id: 'bk-1', status: 'PENDING' },
      data: { status: 'EXPIRED' },
    })
    expect(tx.departureSlot.update).toHaveBeenCalledWith({
      where: { id: 'slot-1' },
      data: { booked: 2, status: 'OPEN' },
    })
    expect(notifyBookingEvent).toHaveBeenCalledWith(expect.anything(), 'bk-1', 'expired')
    expect(bookingsExpiredCounter.add).toHaveBeenCalledWith(1)
  })

  it('nunca deixa booked negativo', async () => {
    tx = makeTx(1, { id: 'slot-1', booked: 1, capacity: 4, status: 'OPEN' })
    mockPrisma.booking.findMany.mockResolvedValue([pendingBooking()])

    await createBookingExpiryJob(makeApp()).onTick()

    expect(tx.departureSlot.update).toHaveBeenCalledWith({
      where: { id: 'slot-1' },
      data: { booked: 0, status: 'OPEN' },
    })
  })

  it('slot CANCELLED preserva o status', async () => {
    tx = makeTx(1, { id: 'slot-1', booked: 2, capacity: 4, status: 'CANCELLED' })
    mockPrisma.booking.findMany.mockResolvedValue([pendingBooking()])

    await createBookingExpiryJob(makeApp()).onTick()

    expect(tx.departureSlot.update).toHaveBeenCalledWith({
      where: { id: 'slot-1' },
      data: { booked: 0 },
    })
  })

  it('envia o e-mail de expiração quando a reserva expirou', async () => {
    const mockSend = vi.fn().mockReturnValue({ catch: vi.fn() })
    mockGetResend.mockReturnValue({ emails: { send: mockSend } })
    mockPrisma.booking.findMany.mockResolvedValue([pendingBooking()])

    await createBookingExpiryJob(makeApp()).onTick()

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['ana@example.com'], subject: 'Sua reserva expirou — CAPI' }),
    )
  })

  it('reserva confirmada no meio do caminho (count 0): sem e-mail, sem métrica, sem notificação', async () => {
    tx = makeTx(0, null)
    const mockSend = vi.fn().mockReturnValue({ catch: vi.fn() })
    mockGetResend.mockReturnValue({ emails: { send: mockSend } })
    mockPrisma.booking.findMany.mockResolvedValue([pendingBooking()])

    await createBookingExpiryJob(makeApp()).onTick()

    expect(mockSend).not.toHaveBeenCalled()
    expect(bookingsExpiredCounter.add).not.toHaveBeenCalled()
    expect(notifyBookingEvent).not.toHaveBeenCalled()
    expect(tx.departureSlot.update).not.toHaveBeenCalled()
  })

  it('falha de e-mail não interrompe o job', async () => {
    const catchMock = vi.fn()
    mockGetResend.mockReturnValue({
      emails: { send: vi.fn().mockReturnValue({ catch: catchMock }) },
    })
    mockPrisma.booking.findMany.mockResolvedValue([pendingBooking()])

    await expect(createBookingExpiryJob(makeApp()).onTick()).resolves.toBeUndefined()
    expect(catchMock).toHaveBeenCalled()
  })

  it('falha em uma reserva não impede as demais', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([
      pendingBooking({ id: 'bk-fail' }),
      pendingBooking({ id: 'bk-ok' }),
    ])
    mockPrisma.$transaction
      .mockRejectedValueOnce(new Error('DB error'))
      .mockImplementationOnce(async (fn: (t: unknown) => unknown) => fn(tx))

    const app = makeApp()
    await createBookingExpiryJob(app).onTick()

    expect(app.log.error).toHaveBeenCalled()
    expect(notifyBookingEvent).toHaveBeenCalledWith(expect.anything(), 'bk-ok', 'expired')
  })
})
