import { randomBytes } from 'crypto'
import { FastifyInstance } from 'fastify'
import prisma from '../../database'

const REFRESH_TOKEN_EXPIRY_DAYS = 30
export const ACCESS_TOKEN_EXPIRY = '15m'

export function generateRefreshToken(): string {
  return randomBytes(40).toString('hex')
}

export async function createRefreshToken(userId: string, tenantId: string): Promise<string> {
  const token = generateRefreshToken()
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await prisma.refreshToken.create({
    data: { token, userId, tenantId, expiresAt },
  })

  return token
}

export async function rotateRefreshToken(oldToken: string): Promise<{ newToken: string; userId: string; tenantId: string } | null> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.refreshToken.findUnique({
      where: { token: oldToken },
    })

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      // If token was already revoked, revoke ALL tokens for this user (potential theft)
      if (existing?.revokedAt) {
        await tx.refreshToken.updateMany({
          where: { userId: existing.userId },
          data: { revokedAt: new Date() },
        })
      }
      return null
    }

    // Revoke old token
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    })

    // Create new token
    const newTokenValue = generateRefreshToken()
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    await tx.refreshToken.create({
      data: { token: newTokenValue, userId: existing.userId, tenantId: existing.tenantId, expiresAt },
    })

    return { newToken: newTokenValue, userId: existing.userId, tenantId: existing.tenantId }
  })
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
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
            OR: [
              { expiresAt: { lt: thirtyDaysAgo } },
              { revokedAt: { lt: thirtyDaysAgo } },
            ],
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
