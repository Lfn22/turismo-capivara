import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../database', () => ({
  default: { departureSlot: { findMany: vi.fn(), updateMany: vi.fn() } },
}))
vi.mock('./cancel-booking', () => ({ cancelBooking: vi.fn() }))
vi.mock('../notifications/booking-events', () => ({
  notifyBookingEvent: vi.fn().mockResolvedValue(undefined),
}))
const send = vi.fn().mockResolvedValue({})
vi.mock('../../shared/email', () => ({
  getResend: vi.fn(() => ({ emails: { send } })),
  getEmailFrom: vi.fn(() => 'CAPI <x@y>'),
}))

import prisma from '../../database'
import { cancelBooking } from './cancel-booking'
import { cancelFutureSlots } from './cancel-future-slots'
import { AppError } from '../../shared/errors/AppError'

const db = prisma as any
const log = { warn: vi.fn(), error: vi.fn() } as any

const booking = (id: string, status: string) => ({
  id,
  status,
  slotId: 's1',
  pax: 1,
  paymentId: `mp-${id}`,
  customerName: 'Ana',
  customerEmail: 'ana@x.com',
})

beforeEach(() => {
  vi.clearAllMocks()
  db.departureSlot.findMany.mockResolvedValue([
    {
      id: 's1',
      startsAt: new Date('2027-01-04T11:00:00Z'),
      package: { name: 'Trilha' },
      bookings: [booking('b1', 'CONFIRMED'), booking('b2', 'PENDING')],
    },
  ])
  db.departureSlot.updateMany.mockResolvedValue({ count: 1 })
  ;(cancelBooking as any).mockResolvedValue(undefined)
})

describe('cancelFutureSlots', () => {
  it('cancela (com estorno) cada reserva ativa, avisa o cliente e só então cancela as datas', async () => {
    const res = await cancelFutureSlots({ packageId: 'p1' }, log)

    expect(cancelBooking).toHaveBeenCalledTimes(2)
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[0][0].text).toMatch(/estornado/)
    expect(db.departureSlot.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['s1'] } },
      data: { status: 'CANCELLED' },
    })
    expect(res).toEqual({ slotsCancelled: 1, bookingsCancelled: 2 })

    const where = db.departureSlot.findMany.mock.calls[0][0].where
    expect(where).toMatchObject({ packageId: 'p1', status: { in: ['OPEN', 'FULL'] } })
    expect(where.startsAt.gt).toBeInstanceOf(Date)
  })

  it('estorno falhou → interrompe sem cancelar as datas (repetir a ação termina o resto)', async () => {
    ;(cancelBooking as any).mockRejectedValueOnce(new AppError('estorno falhou', 502))

    await expect(cancelFutureSlots({ packageId: 'p1' }, log)).rejects.toMatchObject({
      statusCode: 502,
    })
    expect(db.departureSlot.updateMany).not.toHaveBeenCalled()
  })

  it('reserva que mudou no meio (409 do cancelBooking) é ignorada e o resto segue', async () => {
    ;(cancelBooking as any).mockRejectedValueOnce(new AppError('alterada', 409))

    const res = await cancelFutureSlots({ packageId: 'p1' }, log)

    expect(res.bookingsCancelled).toBe(1)
    expect(db.departureSlot.updateMany).toHaveBeenCalled()
  })

  it('sem datas futuras não faz nada', async () => {
    db.departureSlot.findMany.mockResolvedValue([])
    expect(await cancelFutureSlots({ packageId: 'p1' }, log)).toEqual({
      slotsCancelled: 0,
      bookingsCancelled: 0,
    })
    expect(db.departureSlot.updateMany).not.toHaveBeenCalled()
  })
})
