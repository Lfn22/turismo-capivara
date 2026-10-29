import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../database', () => ({
  default: { booking: { findUnique: vi.fn() } },
}))
vi.mock('../notifications.service', () => ({
  notify: vi.fn(),
  tenantAdminIds: vi.fn(),
}))

import prisma from '../../../database'
import { notify, tenantAdminIds } from '../notifications.service'
import { notifyBookingEvent } from '../booking-events'

const db = prisma as any
const log = { warn: vi.fn() } as any

function booking(over: Record<string, unknown> = {}) {
  return {
    userId: 'c1',
    customerName: 'Ana',
    pax: 2,
    tenantId: 't1',
    tenant: { slug: 'capivara' },
    slot: {
      startsAt: new Date('2026-11-05T12:00:00Z'),
      package: { name: 'Trilha do Boqueirão', conductorId: 'g1' },
    },
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  db.booking.findUnique.mockResolvedValue(booking())
  ;(tenantAdminIds as any).mockResolvedValue(['a1', 'g1'])
})

describe('notifyBookingEvent', () => {
  it('created: notifica o turista e a equipe com links próprios', async () => {
    await notifyBookingEvent(log, 'b1', 'created')
    expect(notify).toHaveBeenCalledTimes(2)
    expect(notify).toHaveBeenNthCalledWith(1, {
      userIds: ['c1'],
      type: 'booking.created',
      title: 'Nova reserva',
      body: 'Ana · Trilha do Boqueirão · 2 pessoa(s)',
      link: '/capivara/minha-reserva',
    })
    expect(notify).toHaveBeenNthCalledWith(2, {
      userIds: ['g1', 'a1', 'g1'],
      type: 'booking.created',
      title: 'Nova reserva',
      body: 'Ana · Trilha do Boqueirão · 2 pessoa(s)',
      link: '/capivara/painel/reservas',
    })
  })

  it('confirmed: corpo com a data', async () => {
    await notifyBookingEvent(log, 'b1', 'confirmed')
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'booking.confirmed',
        title: 'Reserva confirmada',
        body: 'Trilha do Boqueirão em 05/11/2026',
      }),
    )
  })

  it('cancelled: corpo com a data', async () => {
    await notifyBookingEvent(log, 'b1', 'cancelled')
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'booking.cancelled',
        title: 'Reserva cancelada',
        body: 'Trilha do Boqueirão em 05/11/2026',
      }),
    )
  })

  it('expired: pagamento não concluído', async () => {
    await notifyBookingEvent(log, 'b1', 'expired')
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'booking.expired',
        title: 'Reserva expirada',
        body: 'Trilha do Boqueirão — pagamento não concluído',
      }),
    )
  })

  it('turista que também é condutor/admin recebe só a notificação de turista', async () => {
    db.booking.findUnique.mockResolvedValue(booking({ userId: 'g1' }))
    await notifyBookingEvent(log, 'b1', 'created')
    expect(notify).toHaveBeenCalledTimes(2)
    expect(notify).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ userIds: ['g1'], link: '/capivara/minha-reserva' }),
    )
    expect(notify).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ userIds: ['a1'], link: '/capivara/painel/reservas' }),
    )
  })

  it('reserva guest: só notifica o painel', async () => {
    db.booking.findUnique.mockResolvedValue(booking({ userId: null }))
    await notifyBookingEvent(log, 'b1', 'created')
    expect(notify).toHaveBeenCalledTimes(1)
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ link: '/capivara/painel/reservas' }))
  })

  it('não lança e registra warn quando o banco falha', async () => {
    db.booking.findUnique.mockRejectedValue(new Error('db'))
    await expect(notifyBookingEvent(log, 'b1', 'created')).resolves.toBeUndefined()
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: 'b1' }),
      '[notif] Falha ao notificar evento de reserva',
    )
  })
})
