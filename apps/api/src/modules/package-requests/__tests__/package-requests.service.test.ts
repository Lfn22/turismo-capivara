import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'

vi.mock('../../../database', () => {
  const db: Record<string, unknown> = {
    packageChangeRequest: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    tourPackage: { findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
  }
  db.$queryRaw = vi.fn().mockResolvedValue([])
  db.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(db))
  return { default: db }
})
vi.mock('../../notifications/notifications.service', () => ({
  notify: vi.fn(),
  resolveAction: vi.fn(),
  platformStaffIds: vi.fn().mockResolvedValue(['staff-1']),
}))
vi.mock('../../bookings/cancel-future-slots', () => ({ cancelFutureSlots: vi.fn() }))

import prisma from '../../../database'
import { notify, resolveAction } from '../../notifications/notifications.service'
import { cancelFutureSlots } from '../../bookings/cancel-future-slots'
import {
  approveRequest,
  cancelRequest,
  diffImportant,
  latestRequestsByPackage,
  rejectRequest,
  submitRequest,
} from '../package-requests.service'

const db = prisma as unknown as {
  $queryRaw: Mock
  packageChangeRequest: Record<
    'findFirst' | 'findUnique' | 'findMany' | 'create' | 'update' | 'updateMany',
    Mock
  >
  tourPackage: { findUnique: Mock; update: Mock }
  user: { findUnique: Mock }
}
const log = { warn: vi.fn(), error: vi.fn() } as never

beforeEach(() => {
  vi.clearAllMocks()
  db.tourPackage.findUnique.mockResolvedValue({ name: 'Trilha' })
  db.user.findUnique.mockResolvedValue({ name: 'Maria' })
  db.packageChangeRequest.updateMany.mockResolvedValue({ count: 1 })
})

describe('diffImportant', () => {
  it('ignora valores iguais (Decimal vs número)', () => {
    expect(
      diffImportant(
        { name: 'A', description: 'd', price: '600.00', extraGuidePrice: null } as never,
        { name: 'A', price: 600 },
      ),
    ).toEqual({})
  })

  it('devolve só o que mudou', () => {
    expect(
      diffImportant(
        { name: 'A', description: 'd', price: '600.00', extraGuidePrice: '400.00' } as never,
        {
          price: 700,
          extraGuidePrice: null,
        },
      ),
    ).toEqual({ price: { from: 600, to: 700 }, extraGuidePrice: { from: 400, to: null } })
  })
})

describe('submitRequest', () => {
  it('cria pedido UPDATE e notifica a equipe', async () => {
    db.packageChangeRequest.findFirst.mockResolvedValue(null)
    db.packageChangeRequest.create.mockResolvedValue({ id: 'r1' })
    const changes = { price: { from: 600, to: 700 } }
    const res = await submitRequest({
      packageId: 'p1',
      requestedById: 'u1',
      type: 'UPDATE',
      changes,
    })
    expect(res).toEqual({ id: 'r1' })
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: ['staff-1'],
        actionKey: 'package-change:r1',
        link: '/super-admin/roteiros?pedidos=1',
      }),
    )
  })

  it('faz merge de UPDATE sobre UPDATE pendente', async () => {
    db.tourPackage.findUnique.mockResolvedValue({
      name: 'A',
      description: 'd',
      price: '600.00',
      extraGuidePrice: null,
    })
    db.packageChangeRequest.findFirst.mockResolvedValue({
      id: 'r1',
      type: 'UPDATE',
      changes: { price: { from: 600, to: 700 } },
    })
    db.packageChangeRequest.update.mockResolvedValue({ id: 'r1' })
    await submitRequest({
      packageId: 'p1',
      requestedById: 'u1',
      type: 'UPDATE',
      changes: { price: { from: 600, to: 650 }, name: { from: 'A', to: 'B' } },
    })
    expect(db.packageChangeRequest.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { changes: { price: { from: 600, to: 650 }, name: { from: 'A', to: 'B' } } },
    })
    expect(notify).not.toHaveBeenCalled()
  })

  it('cancela o pedido quando o merge volta ao valor atual', async () => {
    db.tourPackage.findUnique.mockResolvedValue({
      name: 'A',
      description: 'd',
      price: '600.00',
      extraGuidePrice: null,
    })
    db.packageChangeRequest.findFirst.mockResolvedValue({
      id: 'r1',
      type: 'UPDATE',
      changes: { price: { from: 600, to: 700 } },
    })
    const res = await submitRequest({
      packageId: 'p1',
      requestedById: 'u1',
      type: 'UPDATE',
      changes: { price: { from: 700, to: 600 } },
    })
    expect(res).toBeNull()
    expect(db.packageChangeRequest.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { status: 'CANCELLED' },
    })
    expect(resolveAction).toHaveBeenCalledWith('package-change:r1', 'Maria')
  })

  it('trava o roteiro antes de consultar pendentes', async () => {
    db.packageChangeRequest.findFirst.mockResolvedValue(null)
    db.packageChangeRequest.create.mockResolvedValue({ id: 'r1' })
    await submitRequest({ packageId: 'p1', requestedById: 'u1', type: 'PUBLISH' })
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.packageChangeRequest.findFirst.mock.invocationCallOrder[0],
    )
  })

  it('P2002 no create → 409', async () => {
    db.packageChangeRequest.findFirst.mockResolvedValue(null)
    db.packageChangeRequest.create.mockRejectedValue(
      Object.assign(new Error('dup'), { code: 'P2002' }),
    )
    await expect(
      submitRequest({ packageId: 'p1', requestedById: 'u1', type: 'PUBLISH' }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Já existe um pedido pendente para este roteiro. Cancele-o para fazer outro.',
    })
  })

  it('ARCHIVE com UPDATE pendente → 409', async () => {
    db.packageChangeRequest.findFirst.mockResolvedValue({ id: 'r1', type: 'UPDATE', changes: {} })
    await expect(
      submitRequest({ packageId: 'p1', requestedById: 'u1', type: 'ARCHIVE' }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Já existe um pedido pendente para este roteiro. Cancele-o para fazer outro.',
    })
  })
})

const V = new Date('2026-11-27T10:00:00.000Z')
const pendingReq = (type: string, changes: unknown = null) => ({
  id: 'r1',
  packageId: 'p1',
  requestedById: 'u1',
  type,
  changes,
  status: 'PENDING',
  updatedAt: V,
  package: { id: 'p1', name: 'Trilha', tenant: { slug: 'acme' } },
})

describe('approveRequest', () => {
  it('UPDATE aplica os novos valores', async () => {
    db.packageChangeRequest.findUnique.mockResolvedValue(
      pendingReq('UPDATE', { price: { from: 600, to: 700 } }),
    )
    await approveRequest('r1', 's1', log, V)
    expect(db.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { price: 700 },
    })
    expect(resolveAction).toHaveBeenCalledWith('package-change:r1', 'Maria')
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: ['u1'], link: '/acme/painel/roteiros' }),
    )
  })

  it('PUBLISH grava publishedAt', async () => {
    db.packageChangeRequest.findUnique.mockResolvedValue(pendingReq('PUBLISH'))
    await approveRequest('r1', 's1', log, V)
    expect(db.tourPackage.update.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date)
  })

  it('ARCHIVE estorna antes de desativar', async () => {
    db.packageChangeRequest.findUnique.mockResolvedValue(pendingReq('ARCHIVE'))
    await approveRequest('r1', 's1', log, V)
    expect(cancelFutureSlots).toHaveBeenCalledWith({ packageId: 'p1' }, log)
    expect((cancelFutureSlots as Mock).mock.invocationCallOrder[0]).toBeLessThan(
      db.tourPackage.update.mock.invocationCallOrder[0],
    )
    expect(db.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { active: false },
    })
  })

  it('UNPUBLISH estorna e depois zera publishedAt', async () => {
    db.packageChangeRequest.findUnique.mockResolvedValue(pendingReq('UNPUBLISH'))
    await approveRequest('r1', 's1', log, V)
    expect((cancelFutureSlots as Mock).mock.invocationCallOrder[0]).toBeLessThan(
      db.tourPackage.update.mock.invocationCallOrder[0],
    )
    expect(db.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { publishedAt: null },
    })
  })

  it('estorno falhou: pedido volta a PENDING e roteiro fica intacto', async () => {
    db.packageChangeRequest.findUnique.mockResolvedValue(pendingReq('ARCHIVE'))
    ;(cancelFutureSlots as Mock).mockRejectedValueOnce(new Error('falhou'))
    await expect(approveRequest('r1', 's1', log, V)).rejects.toThrow('falhou')
    expect(db.packageChangeRequest.updateMany).toHaveBeenLastCalledWith({
      where: { id: 'r1', status: 'APPROVED' },
      data: { status: 'PENDING', decidedById: null, decidedAt: null },
    })
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })

  it('gravação do roteiro falhou: pedido volta a PENDING e o erro sobe', async () => {
    db.packageChangeRequest.findUnique.mockResolvedValue(pendingReq('PUBLISH'))
    db.tourPackage.update.mockRejectedValueOnce(new Error('db caiu'))
    await expect(approveRequest('r1', 's1', log, V)).rejects.toThrow('db caiu')
    expect(db.packageChangeRequest.updateMany).toHaveBeenLastCalledWith({
      where: { id: 'r1', status: 'APPROVED' },
      data: { status: 'PENDING', decidedById: null, decidedAt: null },
    })
  })

  it('reivindica só a versão revisada (updatedAt) e aplica o changes dela', async () => {
    db.packageChangeRequest.findUnique.mockResolvedValue(
      pendingReq('UPDATE', { price: { from: 600, to: 700 } }),
    )
    await approveRequest('r1', 's1', log, V)
    expect(db.packageChangeRequest.updateMany.mock.calls[0][0].where).toEqual({
      id: 'r1',
      status: 'PENDING',
      updatedAt: V,
    })
    expect(db.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { price: 700 },
    })
  })

  it('pedido mudou desde a revisão (updatedAt diferente) → 409 sem aplicar nem estornar', async () => {
    db.packageChangeRequest.findUnique.mockResolvedValue({
      ...pendingReq('UPDATE', { price: { from: 600, to: 650 } }),
      updatedAt: new Date('2026-11-27T10:05:00.000Z'),
    })
    await expect(approveRequest('r1', 's1', log, V)).rejects.toMatchObject({
      statusCode: 409,
      message:
        'O pedido mudou desde que você abriu a revisão. Recarregue a lista e revise de novo.',
    })
    expect(db.packageChangeRequest.updateMany).not.toHaveBeenCalled()
    expect(db.tourPackage.update).not.toHaveBeenCalled()
    expect(cancelFutureSlots).not.toHaveBeenCalled()
  })

  it('merge entre a leitura e a reivindicação (count 0, ainda PENDING) → 409 "mudou"', async () => {
    db.packageChangeRequest.findUnique
      .mockResolvedValueOnce(pendingReq('ARCHIVE'))
      .mockResolvedValueOnce({ status: 'PENDING' })
    db.packageChangeRequest.updateMany.mockResolvedValue({ count: 0 })
    await expect(approveRequest('r1', 's1', log, V)).rejects.toMatchObject({
      statusCode: 409,
      message:
        'O pedido mudou desde que você abriu a revisão. Recarregue a lista e revise de novo.',
    })
    expect(cancelFutureSlots).not.toHaveBeenCalled()
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })

  it('pedido já decidido → 409', async () => {
    db.packageChangeRequest.findUnique.mockResolvedValue({
      ...pendingReq('PUBLISH'),
      status: 'APPROVED',
    })
    await expect(approveRequest('r1', 's1', log, V)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Este pedido já foi decidido.',
    })
  })

  it('corrida (count 0, já decidido) → 409', async () => {
    db.packageChangeRequest.findUnique
      .mockResolvedValueOnce(pendingReq('ARCHIVE'))
      .mockResolvedValueOnce({ status: 'APPROVED' })
    db.packageChangeRequest.updateMany.mockResolvedValue({ count: 0 })
    await expect(approveRequest('r1', 's1', log, V)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Este pedido já foi decidido.',
    })
    expect(cancelFutureSlots).not.toHaveBeenCalled()
    expect(db.tourPackage.update).not.toHaveBeenCalled()
  })
})

describe('rejectRequest', () => {
  it('grava o motivo e notifica o guia', async () => {
    db.packageChangeRequest.findUnique.mockResolvedValue(pendingReq('PUBLISH'))
    await rejectRequest('r1', 's1', 'Faltam fotos')
    expect(db.packageChangeRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 'r1', status: 'PENDING' },
      data: expect.objectContaining({
        status: 'REJECTED',
        rejectionReason: 'Faltam fotos',
        decidedById: 's1',
      }),
    })
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: ['u1'],
        body: expect.stringContaining('recusado: Faltam fotos'),
      }),
    )
  })
})

describe('cancelRequest', () => {
  it('cancela o pendente do guia e resolve a notificação', async () => {
    db.packageChangeRequest.findFirst.mockResolvedValue({ id: 'r1' })
    await cancelRequest('p1', 'u1')
    expect(db.packageChangeRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 'r1', status: 'PENDING' },
      data: { status: 'CANCELLED' },
    })
    expect(resolveAction).toHaveBeenCalledWith('package-change:r1', 'Maria')
  })

  it('decidido entre a leitura e o cancelamento (count 0) → 409 sem resolver a notificação', async () => {
    db.packageChangeRequest.findFirst.mockResolvedValue({ id: 'r1' })
    db.packageChangeRequest.updateMany.mockResolvedValue({ count: 0 })
    await expect(cancelRequest('p1', 'u1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Este pedido já foi decidido.',
    })
    expect(resolveAction).not.toHaveBeenCalled()
  })

  it('404 sem pedido pendente', async () => {
    db.packageChangeRequest.findFirst.mockResolvedValue(null)
    await expect(cancelRequest('p1', 'u1')).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('latestRequestsByPackage', () => {
  const row = (
    id: string,
    packageId: string,
    status: string,
    updatedAt = new Date('2026-01-01'),
  ) => ({
    id,
    packageId,
    type: 'UPDATE',
    status,
    rejectionReason: status === 'REJECTED' ? 'x' : null,
    changes: null,
    decidedAt: status === 'PENDING' ? null : new Date('2026-02-01'),
    package: { updatedAt },
  })

  it('PENDING e REJECTED aparecem; APPROVED/CANCELLED mais novos escondem', async () => {
    db.packageChangeRequest.findMany.mockResolvedValue([
      row('a1', 'pa', 'PENDING'),
      row('a0', 'pa', 'REJECTED'),
      row('b1', 'pb', 'REJECTED'),
      row('c2', 'pc', 'APPROVED'),
      row('c1', 'pc', 'REJECTED'),
      row('d2', 'pd', 'CANCELLED'),
      row('d1', 'pd', 'REJECTED'),
    ])
    const map = await latestRequestsByPackage(['pa', 'pb', 'pc', 'pd'])
    expect(map.get('pa')?.id).toBe('a1')
    expect(map.get('pb')?.status).toBe('REJECTED')
    expect(map.has('pc')).toBe(false)
    expect(map.has('pd')).toBe(false)
  })

  it('REJECTED some quando o roteiro foi alterado depois da recusa', async () => {
    db.packageChangeRequest.findMany.mockResolvedValue([
      row('a1', 'pa', 'REJECTED', new Date('2026-03-01')),
      row('b1', 'pb', 'REJECTED', new Date('2026-01-15')),
    ])
    const map = await latestRequestsByPackage(['pa', 'pb'])
    expect(map.has('pa')).toBe(false)
    expect(map.get('pb')?.status).toBe('REJECTED')
  })
})
