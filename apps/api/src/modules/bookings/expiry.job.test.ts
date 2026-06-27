import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('../../database', () => ({
  default: {
    $queryRaw: vi.fn(),
    booking: { findMany: vi.fn(), update: vi.fn() },
    departureSlot: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}))

// Mock shared email
vi.mock('../../shared/email', () => ({
  getResend: vi.fn(),
}))

import prisma from '../../database'
import { getResend } from '../../shared/email'
import { createBookingExpiryJob } from './expiry.job'

function makeApp() {
  return {
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  } as any
}

const mockPrisma = prisma as any
const mockGetResend = getResend as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createBookingExpiryJob schedule', () => {
  it('should run hourly (minute 0), not every minute', () => {
    const app = makeApp()
    const job = createBookingExpiryJob(app)
    expect(job.cronTime).toBe('0 * * * *')
  })
})

describe('createBookingExpiryJob (OPS-01)', () => {
  it('OPS-01: returns early without DB writes when advisory lock not obtained', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ pg_try_advisory_lock: false }])

    const app = makeApp()
    const job = createBookingExpiryJob(app)
    await job.onTick()

    expect(mockPrisma.booking.findMany).not.toHaveBeenCalled()
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('OPS-01: releases advisory lock in finally block even when no bookings found', async () => {
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ pg_try_advisory_lock: true }]) // acquire
      .mockResolvedValueOnce([{}]) // release
    mockPrisma.booking.findMany.mockResolvedValueOnce([])

    const app = makeApp()
    const job = createBookingExpiryJob(app)
    await job.onTick()

    // $queryRaw called twice: acquire + release
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2)
  })

  it('OPS-01: sets booking status to EXPIRED and decrements slot booked in a transaction', async () => {
    const fakeBooking = {
      id: 'bk-1',
      customerName: 'Test User',
      customerEmail: 'test@example.com',
      pax: 2,
      slotId: 'slot-1',
      tenantId: 'tenant-1',
      slot: {
        status: 'FULL',
        booked: 4,
        capacity: 4,
        package: { name: 'Passeio', tenant: { slug: 'my-tenant' } },
      },
    }

    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ pg_try_advisory_lock: true }])
      .mockResolvedValueOnce([{}])

    mockPrisma.booking.findMany.mockResolvedValueOnce([fakeBooking])

    // Simulate $transaction executing the callback
    mockPrisma.$transaction.mockImplementationOnce(async (fn: Function) => {
      const tx = {
        booking: { update: vi.fn() },
        departureSlot: { update: vi.fn() },
        $queryRaw: vi.fn().mockResolvedValueOnce([{
          id: 'slot-1', booked: 4, capacity: 4, status: 'FULL',
        }]),
      }
      await fn(tx)
      // Verify booking was expired
      expect(tx.booking.update).toHaveBeenCalledWith({
        where: { id: 'bk-1' },
        data: { status: 'EXPIRED' },
      })
      // Verify slot booked was decremented
      expect(tx.departureSlot.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'slot-1' },
          data: expect.objectContaining({ booked: { decrement: 2 } }),
        }),
      )
    })

    mockGetResend.mockReturnValue(null) // no email

    const app = makeApp()
    const job = createBookingExpiryJob(app)
    await job.onTick()

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('OPS-01: sends NOTIF-04 expiry email fire-and-forget when resend available', async () => {
    const fakeBooking = {
      id: 'bk-2',
      customerName: 'Ana',
      customerEmail: 'ana@example.com',
      pax: 1,
      slotId: 'slot-2',
      tenantId: 'tenant-2',
      slot: {
        status: 'OPEN',
        booked: 1,
        capacity: 5,
        package: { name: 'Tour', tenant: { slug: 'tour-slug' } },
      },
    }

    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ pg_try_advisory_lock: true }])
      .mockResolvedValueOnce([{}])

    mockPrisma.booking.findMany.mockResolvedValueOnce([fakeBooking])
    mockPrisma.$transaction.mockImplementationOnce(async (fn: Function) => {
      const tx = {
        booking: { update: vi.fn() },
        departureSlot: { update: vi.fn() },
        $queryRaw: vi.fn().mockResolvedValueOnce([{
          id: 'slot-2', booked: 1, capacity: 5, status: 'OPEN',
        }]),
      }
      await fn(tx)
    })

    const mockSend = vi.fn().mockReturnValue({ catch: vi.fn() })
    mockGetResend.mockReturnValue({ emails: { send: mockSend } })

    const app = makeApp()
    const job = createBookingExpiryJob(app)
    await job.onTick()

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['ana@example.com'],
        subject: 'Sua reserva expirou — CAPI',
      }),
    )
  })

  it('OPS-01: email failure does not throw or stop expiry processing', async () => {
    const fakeBooking = {
      id: 'bk-3',
      customerName: 'Bruno',
      customerEmail: 'bruno@example.com',
      pax: 1,
      slotId: 'slot-3',
      tenantId: 'tenant-3',
      slot: {
        status: 'OPEN',
        booked: 1,
        capacity: 3,
        package: { name: 'Passeio', tenant: { slug: 'slug-3' } },
      },
    }

    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ pg_try_advisory_lock: true }])
      .mockResolvedValueOnce([{}])

    mockPrisma.booking.findMany.mockResolvedValueOnce([fakeBooking])
    mockPrisma.$transaction.mockImplementationOnce(async (fn: Function) => {
      const tx = {
        booking: { update: vi.fn() },
        departureSlot: { update: vi.fn() },
        $queryRaw: vi.fn().mockResolvedValueOnce([{
          id: 'slot-3', booked: 1, capacity: 3, status: 'OPEN',
        }]),
      }
      await fn(tx)
    })

    // email.send returns a promise that rejects — caught via .catch()
    const catchMock = vi.fn()
    const mockSend = vi.fn().mockReturnValue({ catch: catchMock })
    mockGetResend.mockReturnValue({ emails: { send: mockSend } })

    const app = makeApp()
    const job = createBookingExpiryJob(app)

    // Must not throw
    await expect(job.onTick()).resolves.toBeUndefined()
    expect(catchMock).toHaveBeenCalled()
  })

  it('OPS-01: advisory lock is always released even when transaction throws', async () => {
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ pg_try_advisory_lock: true }])
      .mockResolvedValueOnce([{}]) // release in finally

    mockPrisma.booking.findMany.mockResolvedValueOnce([{
      id: 'bk-fail',
      customerName: 'X',
      customerEmail: 'x@x.com',
      pax: 1,
      slotId: 's1',
      tenantId: 't1',
      slot: null,
    }])

    mockPrisma.$transaction.mockRejectedValueOnce(new Error('DB error'))
    mockGetResend.mockReturnValue(null)

    const app = makeApp()
    const job = createBookingExpiryJob(app)
    await job.onTick()

    // Second $queryRaw call is the unlock
    const calls = mockPrisma.$queryRaw.mock.calls
    expect(calls.length).toBeGreaterThanOrEqual(2)
  })
})
