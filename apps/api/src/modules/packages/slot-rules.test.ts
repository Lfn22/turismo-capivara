import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../database', () => ({
  default: {
    guideProfile: { findUnique: vi.fn() },
    packageGuide: { findFirst: vi.fn() },
  },
}))

import prisma from '../../database'
import {
  tourDateTime,
  tourDayRange,
  tourDateKey,
  weekdayOf,
  eachDate,
  assertGuideFree,
  assertGuideAssignable,
  ScheduleConflictError,
  occupiedUntil,
} from './slot-rules'

const db = prisma as any
const PKG = { durationMaxHours: 3, bufferMinutes: 60 } // ocupa 4h

describe('fuso dos passeios (São Paulo)', () => {
  it('08:00 do formulário é 08:00 em São Paulo (11:00 UTC), não do servidor', () => {
    expect(tourDateTime('2027-01-04', '08:00').toISOString()).toBe('2027-01-04T11:00:00.000Z')
  })

  it('dia de São Paulo vai das 03:00 UTC às 02:59:59 UTC do dia seguinte', () => {
    const { start, end } = tourDayRange('2027-01-04')
    expect(start.toISOString()).toBe('2027-01-04T03:00:00.000Z')
    expect(end.toISOString()).toBe('2027-01-05T02:59:59.999Z')
  })

  it('slot às 22:00 de SP pertence ao mesmo dia (não ao seguinte, como no UTC)', () => {
    expect(tourDateKey(new Date('2027-01-05T01:00:00.000Z'))).toBe('2027-01-04')
  })

  it('dia da semana e intervalo de datas independem do fuso', () => {
    expect(weekdayOf('2027-01-04')).toBe(1) // segunda
    expect(eachDate('2027-01-30', '2027-02-02')).toEqual([
      '2027-01-30',
      '2027-01-31',
      '2027-02-01',
      '2027-02-02',
    ])
  })
})

describe('occupiedUntil', () => {
  it('sem durationMaxHours (nenhum fluxo grava), usa a duração do roteiro', () => {
    const start = new Date('2027-01-04T11:00:00Z')
    // 4h de passeio + 60 min de buffer = 5h
    expect(occupiedUntil(start, { durationMaxHours: null, duration: 4, bufferMinutes: 60 })).toBe(
      start.getTime() + 5 * 3600_000,
    )
  })
})

describe('assertGuideFree', () => {
  const tx = { departureSlot: { findMany: vi.fn() } } as any
  beforeEach(() => tx.departureSlot.findMany.mockReset())

  it('conflito com slot existente considera o buffer', async () => {
    // existente 08:00 ocupa até 12:00 (3h + 1h de buffer); novo às 11:30 conflita
    tx.departureSlot.findMany.mockResolvedValue([
      {
        startsAt: new Date('2027-01-04T11:00:00Z'),
        package: { ...PKG, name: 'Trilha' },
        guide: { user: { name: 'Ana' } },
      },
    ])
    await expect(
      assertGuideFree(tx, 'gp1', PKG, [new Date('2027-01-04T14:30:00Z')]),
    ).rejects.toBeInstanceOf(ScheduleConflictError)
  })

  it('sem sobreposição → ok', async () => {
    tx.departureSlot.findMany.mockResolvedValue([
      { startsAt: new Date('2027-01-04T11:00:00Z'), package: { ...PKG, name: 'T' }, guide: null },
    ])
    await expect(
      assertGuideFree(tx, 'gp1', PKG, [new Date('2027-01-04T15:00:00Z')]),
    ).resolves.toBeUndefined()
  })

  it('detecta conflito entre as datas do próprio lote', async () => {
    tx.departureSlot.findMany.mockResolvedValue([])
    await expect(
      assertGuideFree(tx, 'gp1', PKG, [
        new Date('2027-01-04T11:00:00Z'),
        new Date('2027-01-04T13:00:00Z'),
      ]),
    ).rejects.toBeInstanceOf(ScheduleConflictError)
  })

  it('edição ignora o próprio slot', async () => {
    tx.departureSlot.findMany.mockResolvedValue([])
    await assertGuideFree(tx, 'gp1', PKG, [new Date('2027-01-04T11:00:00Z')], 's1')
    expect(tx.departureSlot.findMany.mock.calls[0][0].where.id).toEqual({ not: 's1' })
  })
})

describe('assertGuideAssignable', () => {
  const pkg = { id: 'p1', conductorId: 'u-cond' }
  const admin = { sub: 'adm', role: 'ADMIN', tenantId: 't1' }
  beforeEach(() => vi.resetAllMocks())

  function guide(over: Record<string, unknown> = {}) {
    return { userId: 'u-g', user: { tenantId: 't1', approvalStatus: 'APPROVED' }, ...over }
  }

  it('guia de outro tenant → 403', async () => {
    db.guideProfile.findUnique.mockResolvedValue(
      guide({ user: { tenantId: 't2', approvalStatus: 'APPROVED' } }),
    )
    await expect(assertGuideAssignable(admin, 'gp', 't1', pkg)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('CONDUTOR agendando outro guia → 403', async () => {
    db.guideProfile.findUnique.mockResolvedValue(guide())
    const cond = { sub: 'u-cond', role: 'CONDUTOR', tenantId: 't1' }
    await expect(assertGuideAssignable(cond, 'gp', 't1', pkg)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('guia não aprovado → 422', async () => {
    db.guideProfile.findUnique.mockResolvedValue(
      guide({ user: { tenantId: 't1', approvalStatus: 'PENDING' } }),
    )
    await expect(assertGuideAssignable(admin, 'gp', 't1', pkg)).rejects.toMatchObject({
      statusCode: 422,
    })
  })

  it('guia que não faz parte do roteiro → 422', async () => {
    db.guideProfile.findUnique.mockResolvedValue(guide())
    db.packageGuide.findFirst.mockResolvedValue(null)
    await expect(assertGuideAssignable(admin, 'gp', 't1', pkg)).rejects.toMatchObject({
      statusCode: 422,
    })
  })

  it('membro ACCEPTED ou condutor do roteiro → ok', async () => {
    db.guideProfile.findUnique.mockResolvedValue(guide())
    db.packageGuide.findFirst.mockResolvedValue({ id: 'pg' })
    await expect(assertGuideAssignable(admin, 'gp', 't1', pkg)).resolves.toBeUndefined()

    db.guideProfile.findUnique.mockResolvedValue(guide({ userId: 'u-cond' }))
    await expect(assertGuideAssignable(admin, 'gp', 't1', pkg)).resolves.toBeUndefined()
  })
})
