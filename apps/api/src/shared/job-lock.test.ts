import { describe, it, expect, vi, beforeEach } from 'vitest'

const tx = { $queryRaw: vi.fn() }
vi.mock('../database', () => ({
  default: { $transaction: vi.fn() },
}))

import prisma from '../database'
import { withAdvisoryXactLock } from './job-lock'

const db = prisma as any

beforeEach(() => {
  vi.clearAllMocks()
  db.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx))
})

describe('withAdvisoryXactLock', () => {
  it('usa lock de transação (liberado no fim da transação, na mesma conexão)', async () => {
    tx.$queryRaw.mockResolvedValue([{ locked: true }])
    const work = vi.fn()

    expect(await withAdvisoryXactLock(42, work)).toBe(true)

    const sql = tx.$queryRaw.mock.calls[0][0].join('?')
    expect(sql).toContain('pg_try_advisory_xact_lock')
    expect(sql).not.toContain('pg_advisory_unlock')
    expect(work).toHaveBeenCalledTimes(1)
  })

  it('lock ocupado → não executa o trabalho', async () => {
    tx.$queryRaw.mockResolvedValue([{ locked: false }])
    const work = vi.fn()

    expect(await withAdvisoryXactLock(42, work)).toBe(false)
    expect(work).not.toHaveBeenCalled()
  })

  it('a transação do lock tem timeout longo o bastante para o job', async () => {
    tx.$queryRaw.mockResolvedValue([{ locked: true }])
    await withAdvisoryXactLock(42, async () => {})
    expect(db.$transaction.mock.calls[0][1]).toMatchObject({ timeout: expect.any(Number) })
    expect(db.$transaction.mock.calls[0][1].timeout).toBeGreaterThanOrEqual(5 * 60_000)
  })
})
