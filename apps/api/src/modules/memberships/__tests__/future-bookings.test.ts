import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../../database', () => ({
  default: { booking: { findMany: vi.fn() } },
}))

import prisma from '../../../database'
import { findGuideFutureBookings } from '../future-bookings'

const db = prisma as any
const NOW = new Date('2026-11-01T12:00:00Z')

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  db.booking.findMany.mockResolvedValue([])
})
afterEach(() => vi.useRealTimers())

describe('findGuideFutureBookings', () => {
  it('escopo de destino: status, startsAt > agora, OR do guia e destino do tenant', async () => {
    await findGuideFutureBookings({ userId: 'u1', guideProfileId: 'gp1', destinationId: 'd1' })
    const where = db.booking.findMany.mock.calls[0][0].where
    expect(where).toEqual({
      status: { in: ['PENDING', 'CONFIRMED'] },
      slot: {
        startsAt: { gt: NOW },
        OR: [{ guideId: 'gp1' }, { guideId: null, package: { conductorId: 'u1' } }],
        package: { tenant: { destinationId: 'd1' } },
      },
    })
  })

  it('escopo de roteiro: filtra por slot.packageId e não por destino', async () => {
    await findGuideFutureBookings({ userId: 'u1', guideProfileId: 'gp1', packageId: 'p1' })
    const where = db.booking.findMany.mock.calls[0][0].where
    expect(where.slot.packageId).toBe('p1')
    expect(where.slot.package).toBeUndefined()
    expect(where.slot.OR).toEqual([{ guideId: 'gp1' }, { guideId: null, package: { conductorId: 'u1' } }])
    expect(where.slot.startsAt).toEqual({ gt: NOW })
  })

  it('exige destinationId ou packageId', async () => {
    await expect(findGuideFutureBookings({ userId: 'u1', guideProfileId: 'gp1' })).rejects.toThrow()
    expect(db.booking.findMany).not.toHaveBeenCalled()
  })

  it('mapeia o resultado', async () => {
    const startsAt = new Date('2026-12-01T10:00:00Z')
    db.booking.findMany.mockResolvedValue([
      { id: 'b1', status: 'CONFIRMED', slot: { startsAt, package: { name: 'Trilha' } } },
    ])
    expect(await findGuideFutureBookings({ userId: 'u1', guideProfileId: 'gp1', packageId: 'p1' })).toEqual([
      { id: 'b1', startsAt, packageName: 'Trilha', status: 'CONFIRMED' },
    ])
  })
})
