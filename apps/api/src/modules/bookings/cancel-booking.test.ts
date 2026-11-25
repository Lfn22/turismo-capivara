import { describe, it, expect, vi, beforeEach } from 'vitest'

const tx = {
  $queryRaw: vi.fn(),
  booking: { updateMany: vi.fn() },
  departureSlot: { update: vi.fn() },
}

vi.mock('../../database', () => ({
  default: { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) },
}))
vi.mock('../../services/payment.service', () => ({
  refundPayment: vi.fn(),
  cancelPixPayment: vi.fn(),
}))

import { cancelBooking } from './cancel-booking'
import { refundPayment, cancelPixPayment } from '../../services/payment.service'
import { AppError } from '../../shared/errors/AppError'

const base = { id: 'b1', slotId: 's1', pax: 2, paymentId: 'mp-1' }
const log = { warn: vi.fn(), error: vi.fn() } as any

beforeEach(() => {
  vi.clearAllMocks()
  tx.booking.updateMany.mockResolvedValue({ count: 1 })
  tx.$queryRaw.mockResolvedValue([{ booked: 5, capacity: 5, status: 'FULL' }])
  ;(refundPayment as any).mockResolvedValue(undefined)
  ;(cancelPixPayment as any).mockResolvedValue(undefined)
})

describe('cancelBooking', () => {
  it('CONFIRMED: estorna antes de cancelar e libera a vaga', async () => {
    await cancelBooking({ ...base, status: 'CONFIRMED' }, log)

    expect(refundPayment).toHaveBeenCalledWith('mp-1')
    expect(tx.booking.updateMany).toHaveBeenCalledWith({
      where: { id: 'b1', status: 'CONFIRMED' },
      data: { status: 'CANCELLED' },
    })
    expect(tx.departureSlot.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { booked: 3, status: 'OPEN' },
    })
    expect((refundPayment as any).mock.invocationCallOrder[0]).toBeLessThan(
      tx.booking.updateMany.mock.invocationCallOrder[0],
    )
  })

  it('CONFIRMED: estorno falhou → não cancela e responde 502', async () => {
    ;(refundPayment as any).mockRejectedValue(new Error('HTTP 400'))

    const err = await cancelBooking({ ...base, status: 'CONFIRMED' }, log).catch((e) => e)

    expect(err).toBeInstanceOf(AppError)
    expect(err.statusCode).toBe(502)
    expect(tx.booking.updateMany).not.toHaveBeenCalled()
  })

  it('PENDING: cancela a cobrança PIX no MP e não estorna', async () => {
    await cancelBooking({ ...base, status: 'PENDING' }, log)

    expect(refundPayment).not.toHaveBeenCalled()
    expect(cancelPixPayment).toHaveBeenCalledWith('mp-1')
  })

  it('PENDING: falha ao cancelar o PIX não desfaz o cancelamento', async () => {
    ;(cancelPixPayment as any).mockRejectedValue(new Error('down'))
    await expect(cancelBooking({ ...base, status: 'PENDING' }, log)).resolves.toBeUndefined()
    expect(log.error).toHaveBeenCalled()
  })

  it('corrida: status mudou antes da transação → 409 e não libera a vaga', async () => {
    tx.booking.updateMany.mockResolvedValue({ count: 0 })

    const err = await cancelBooking({ ...base, status: 'PENDING' }, log).catch((e) => e)

    expect(err.statusCode).toBe(409)
    expect(tx.departureSlot.update).not.toHaveBeenCalled()
    expect(cancelPixPayment).not.toHaveBeenCalled()
  })

  it('slot CANCELLED mantém o status ao liberar a vaga', async () => {
    tx.$queryRaw.mockResolvedValue([{ booked: 2, capacity: 5, status: 'CANCELLED' }])
    await cancelBooking({ ...base, status: 'PENDING' }, log)
    expect(tx.departureSlot.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { booked: 0 },
    })
  })
})
