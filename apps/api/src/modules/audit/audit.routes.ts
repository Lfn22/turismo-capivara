import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import prisma from '../../database'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { parseQuery } from '../../shared/utils/zod-error'
import { paginationQuerySchema, paginatedResponse } from '../../shared/utils/pagination'

const auditQuerySchema = paginationQuerySchema.extend({
  action: z.string().optional(),
  // Ficam no metadata JSON (AuditLog não tem colunas de ator/tenant)
  actorId: z.string().optional(),
  tenantSlug: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export async function auditRoutes(app: FastifyInstance) {
  app.get(
    '/admin/audit-logs',
    { preHandler: [authenticate, authorize([Role.SUPER_ADMIN])] },
    async (request, reply) => {
      const { data: query, error } = parseQuery(auditQuerySchema, request.query, reply)
      if (error) return

      const { action, actorId, tenantSlug, from, to, cursor, limit } = query

      const where: Record<string, unknown> = {}
      if (action) where.action = action
      const metadataFilters = [
        ...(actorId ? [{ metadata: { path: ['actorUserId'], equals: actorId } }] : []),
        ...(tenantSlug ? [{ metadata: { path: ['tenantSlug'], equals: tenantSlug } }] : []),
      ]
      if (metadataFilters.length > 0) where.AND = metadataFilters
      if (from || to) {
        where.createdAt = {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        }
      }

      const items = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      })

      return reply.status(200).send(paginatedResponse(items, limit))
    },
  )
}
