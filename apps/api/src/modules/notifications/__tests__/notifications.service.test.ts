import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../database', () => ({
  default: {
    notification: {
      createMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import prisma from '../../../database'
import { notify, resolveAction, platformStaffIds, tenantAdminIds } from '../notifications.service'

const db = prisma as any

beforeEach(() => vi.clearAllMocks())

describe('notifications.service', () => {
  it('cria uma notificação por usuário, sem duplicar ids', async () => {
    await notify({ userIds: ['u1', 'u1', 'u2'], type: 'booking.created', title: 'Nova reserva', body: 'x' })
    expect(db.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: 'u1', type: 'booking.created', title: 'Nova reserva', body: 'x', link: null }),
        expect.objectContaining({ userId: 'u2' }),
      ],
    })
  })

  it('não faz nada com lista vazia', async () => {
    await notify({ userIds: [], type: 't', title: 't', body: 'b' })
    expect(db.notification.createMany).not.toHaveBeenCalled()
  })

  it('com groupKey, incrementa a não lida existente em vez de criar', async () => {
    db.notification.findFirst.mockResolvedValueOnce({ id: 'n1' })
    await notify({ userIds: ['u1'], type: 'guide.registered', title: 'T2', body: 'B2', groupKey: 'guide.registered' })
    expect(db.notification.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'u1', groupKey: 'guide.registered', readAt: null },
    }))
    expect(db.notification.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: expect.objectContaining({ count: { increment: 1 }, title: 'T2', body: 'B2', digestedAt: null }),
    })
    expect(db.notification.create).not.toHaveBeenCalled()
  })

  it('com groupKey e sem não lida, cria', async () => {
    db.notification.findFirst.mockResolvedValueOnce(null)
    await notify({ userIds: ['u1'], type: 'guide.registered', title: 'T', body: 'B', groupKey: 'g' })
    expect(db.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'u1', groupKey: 'g' }),
    })
  })

  it('com actionKey, nunca agrupa: sempre cria uma nova linha', async () => {
    db.notification.findFirst.mockResolvedValueOnce({ id: 'n1' })
    await notify({ userIds: ['u1'], type: 'guide.registered', title: 'T', body: 'B', groupKey: 'g', actionKey: 'a:2' })
    expect(db.notification.findFirst).not.toHaveBeenCalled()
    expect(db.notification.update).not.toHaveBeenCalled()
    expect(db.notification.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ userId: 'u1', actionKey: 'a:2' })],
    })
    db.notification.findFirst.mockReset()
  })

  it('resolveAction marca todas as notificações da pendência como resolvidas e lidas', async () => {
    await resolveAction('guide-verification:g1', 'Fulana')
    expect(db.$transaction).toHaveBeenCalledTimes(1)
    expect(db.notification.updateMany).toHaveBeenCalledWith({
      where: { actionKey: 'guide-verification:g1', resolvedAt: null },
      data: { resolvedAt: expect.any(Date), resolvedByName: 'Fulana' },
    })
    expect(db.notification.updateMany).toHaveBeenCalledWith({
      where: { actionKey: 'guide-verification:g1', readAt: null },
      data: { readAt: expect.any(Date) },
    })
  })

  it('platformStaffIds busca SUPER_ADMIN e PLATFORM_ADMIN', async () => {
    db.user.findMany.mockResolvedValueOnce([{ id: 's1' }, { id: 'p1' }])
    expect(await platformStaffIds()).toEqual(['s1', 'p1'])
    expect(db.user.findMany).toHaveBeenCalledWith({
      where: { role: { in: ['SUPER_ADMIN', 'PLATFORM_ADMIN'] } }, select: { id: true },
    })
  })

  it('tenantAdminIds busca ADMIN do tenant', async () => {
    db.user.findMany.mockResolvedValueOnce([{ id: 'a1' }])
    expect(await tenantAdminIds('t1')).toEqual(['a1'])
    expect(db.user.findMany).toHaveBeenCalledWith({ where: { tenantId: 't1', role: 'ADMIN' }, select: { id: true } })
  })
})
