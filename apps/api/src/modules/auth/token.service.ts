import { randomBytes, createHash } from 'crypto'
import { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import prisma from '../../database'

const REFRESH_TOKEN_EXPIRY_DAYS = 30
export const ACCESS_TOKEN_EXPIRY = '15m'
// Requisições concorrentes podem apresentar o mesmo refresh token logo após a rotação
export const ROTATION_GRACE_MS = 60 * 1000

export function generateRefreshToken(): string {
  return randomBytes(40).toString('hex')
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createRefreshToken(userId: string, tenantId: string): Promise<string> {
  const token = generateRefreshToken()
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await prisma.refreshToken.create({
    data: { token: hashToken(token), userId, tenantId, expiresAt },
  })

  return token
}

export async function rotateRefreshToken(
  oldToken: string,
): Promise<{ newToken: string; userId: string; tenantId: string } | null> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.refreshToken.findUnique({
      where: { token: hashToken(oldToken) },
    })

    const now = new Date()
    if (!existing || existing.expiresAt < now) return null

    if (existing.revokedAt) {
      // Revogado por rotação há menos de ROTATION_GRACE_MS: corrida entre requisições
      // concorrentes do mesmo cliente — emite um token novo em vez de tratar como roubo.
      // Tokens revogados por logout/troca de senha/e-mail têm replacedAt nulo e nunca entram aqui.
      if (
        existing.replacedAt &&
        now.getTime() - existing.replacedAt.getTime() < ROTATION_GRACE_MS
      ) {
        const newToken = await insertRefreshToken(tx, existing.userId, existing.tenantId)
        return { newToken, userId: existing.userId, tenantId: existing.tenantId }
      }
      // Reuso fora da janela: possível roubo — revoga TODOS os tokens do usuário
      await revokeAllUserTokens(existing.userId, tx)
      return null
    }

    // Revoga o token antigo marcando que foi substituído (rotação)
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: now, replacedAt: now },
    })

    const newToken = await insertRefreshToken(tx, existing.userId, existing.tenantId)
    return { newToken, userId: existing.userId, tenantId: existing.tenantId }
  })
}

async function insertRefreshToken(
  tx: Prisma.TransactionClient,
  userId: string,
  tenantId: string,
): Promise<string> {
  const token = generateRefreshToken()
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  await tx.refreshToken.create({ data: { token: hashToken(token), userId, tenantId, expiresAt } })
  return token
}

/**
 * Revoga todos os refresh tokens do usuário (logout, troca de senha/e-mail, roubo).
 * Também zera replacedAt dos já rotacionados para que nenhum volte a ser aceito
 * pela janela de tolerância de rotação.
 */
export async function revokeAllUserTokens(
  userId: string,
  db: Pick<Prisma.TransactionClient, 'refreshToken'> = prisma,
): Promise<void> {
  await db.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  await db.refreshToken.updateMany({
    where: { userId, replacedAt: { not: null } },
    data: { replacedAt: null },
  })
}

export function createTokenCleanupJob(app: FastifyInstance) {
  return {
    cronTime: '0 3 * * *', // Daily at 3 AM
    onTick: async () => {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const result = await prisma.refreshToken.deleteMany({
          where: {
            OR: [{ expiresAt: { lt: thirtyDaysAgo } }, { revokedAt: { lt: thirtyDaysAgo } }],
          },
        })
        app.log.info(`[cron:token-cleanup] Deleted ${result.count} expired/revoked refresh tokens`)
      } catch (err) {
        app.log.error({ err }, '[cron:token-cleanup] Failed to clean up refresh tokens')
      }
    },
    start: true,
  }
}
