import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../database', () => {
  const db: any = {
    refreshToken: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  }
  db.$transaction = vi.fn(async (fn: any) => fn(db))
  return { default: db }
})

import prisma from '../../database'
import { rotateRefreshToken, revokeAllUserTokens, ROTATION_GRACE_MS } from './token.service'

const db = prisma as any
const future = () => new Date(Date.now() + 24 * 60 * 60 * 1000)

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rt-1',
    token: 'old',
    userId: 'user-1',
    tenantId: 'tenant-1',
    expiresAt: future(),
    revokedAt: null,
    replacedAt: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  db.$transaction.mockImplementation(async (fn: any) => fn(db))
})

describe('rotateRefreshToken', () => {
  it('token desconhecido → null', async () => {
    db.refreshToken.findUnique.mockResolvedValue(null)
    expect(await rotateRefreshToken('x')).toBeNull()
    expect(db.refreshToken.updateMany).not.toHaveBeenCalled()
  })

  it('token expirado → null', async () => {
    db.refreshToken.findUnique.mockResolvedValue(row({ expiresAt: new Date(Date.now() - 1000) }))
    expect(await rotateRefreshToken('old')).toBeNull()
    expect(db.refreshToken.create).not.toHaveBeenCalled()
  })

  it('token ativo → revoga marcando replacedAt e emite novo', async () => {
    db.refreshToken.findUnique.mockResolvedValue(row())
    const result = await rotateRefreshToken('old')
    expect(result).toEqual({ newToken: expect.any(String), userId: 'user-1', tenantId: 'tenant-1' })
    expect(db.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-1' },
      data: { revokedAt: expect.any(Date), replacedAt: expect.any(Date) },
    })
    expect(db.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ token: result!.newToken, userId: 'user-1', tenantId: 'tenant-1' }),
    })
  })

  it('reuso dentro da janela após rotação (corrida) → emite token novo sem revogar tudo', async () => {
    const rotatedAt = new Date(Date.now() - 5_000)
    db.refreshToken.findUnique.mockResolvedValue(row({ revokedAt: rotatedAt, replacedAt: rotatedAt }))
    const result = await rotateRefreshToken('old')
    expect(result).toEqual({ newToken: expect.any(String), userId: 'user-1', tenantId: 'tenant-1' })
    expect(db.refreshToken.create).toHaveBeenCalledTimes(1)
    expect(db.refreshToken.updateMany).not.toHaveBeenCalled()
    expect(db.refreshToken.update).not.toHaveBeenCalled()
  })

  it('reuso após a janela → trata como roubo: revoga todos e retorna null', async () => {
    const rotatedAt = new Date(Date.now() - ROTATION_GRACE_MS - 1_000)
    db.refreshToken.findUnique.mockResolvedValue(row({ revokedAt: rotatedAt, replacedAt: rotatedAt }))
    expect(await rotateRefreshToken('old')).toBeNull()
    expect(db.refreshToken.create).not.toHaveBeenCalled()
    expect(db.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    })
    expect(db.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', replacedAt: { not: null } },
      data: { replacedAt: null },
    })
  })

  it('revogado por logout/troca de senha (replacedAt nulo), mesmo há 1s → nunca aceito, revoga todos', async () => {
    db.refreshToken.findUnique.mockResolvedValue(row({ revokedAt: new Date(Date.now() - 1_000), replacedAt: null }))
    expect(await rotateRefreshToken('old')).toBeNull()
    expect(db.refreshToken.create).not.toHaveBeenCalled()
    expect(db.refreshToken.updateMany).toHaveBeenCalled()
  })
})

describe('revokeAllUserTokens', () => {
  it('revoga ativos e tira os rotacionados da janela de tolerância', async () => {
    await revokeAllUserTokens('user-1')
    expect(db.refreshToken.updateMany).toHaveBeenNthCalledWith(1, {
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    })
    expect(db.refreshToken.updateMany).toHaveBeenNthCalledWith(2, {
      where: { userId: 'user-1', replacedAt: { not: null } },
      data: { replacedAt: null },
    })
  })

  it('usa o client de transação quando informado', async () => {
    const tx = { refreshToken: { updateMany: vi.fn() } }
    await revokeAllUserTokens('user-1', tx as any)
    expect(tx.refreshToken.updateMany).toHaveBeenCalledTimes(2)
    expect(db.refreshToken.updateMany).not.toHaveBeenCalled()
  })
})
