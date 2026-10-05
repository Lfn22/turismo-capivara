import type { PrismaClient, AuditActorType, AuditTargetType } from '@prisma/client'
import pino from 'pino'

const logger = pino({ name: 'audit' })

interface AuditEntry {
  actorType: AuditActorType
  actorId?: string
  action: string
  targetType: AuditTargetType
  targetId: string
  ipAddress?: string
  metadata?: Record<string, string | number | boolean | null>
}

export function auditLog(prisma: PrismaClient, entry: AuditEntry): void {
  prisma.auditLog
    .create({ data: entry })
    .catch((err) => logger.error({ err, entry }, 'Failed to write audit log'))
}
