import { FastifyInstance, FastifyReply } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { userRateLimitKey } from '../../shared/utils/user-rate-limit'

const PAGE_SIZE = 20

const idParamsSchema = z.object({
  id: z.string().min(1, { message: 'Id obrigatório' }).max(64, { message: 'Id inválido' }),
})

const listQuerySchema = z.object({
  cursor: z.string().max(64, { message: 'Cursor inválido' }).optional(),
})

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  link: true,
  count: true,
  readAt: true,
  actionKey: true,
  resolvedAt: true,
  resolvedByName: true,
  updatedAt: true,
} as const

// Todo o tráfego do sininho chega via /api/proxy (mesmo IP), então o limite é por usuário.
// O JWT é VERIFICADO (userRateLimitKey): só decodificar deixava um token forjado com o
// sub da vítima esgotar o limite dela.
const notificationsKeyGenerator = userRateLimitKey('notif')

const rateLimit = (max: number) => ({
  rateLimit: { max, timeWindow: '1 minute', keyGenerator: notificationsKeyGenerator },
})

function badRequest(reply: FastifyReply, err: ZodError) {
  return reply.status(400).send({
    message: 'Dados inválidos',
    errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
  })
}

export async function notificationsRoutes(app: FastifyInstance) {
  const preHandler = [authenticate]

  app.get('/notifications', { preHandler, config: rateLimit(60) }, async (request, reply) => {
    let query
    try {
      query = listQuerySchema.parse(request.query)
    } catch (err) {
      if (err instanceof ZodError) return badRequest(reply, err)
      throw err
    }

    const rows = await prisma.notification.findMany({
      where: { userId: request.user.sub },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: notificationSelect,
    })

    const hasMore = rows.length > PAGE_SIZE
    const notifications = hasMore ? rows.slice(0, PAGE_SIZE) : rows
    const nextCursor = hasMore ? notifications[notifications.length - 1].id : null
    return reply.status(200).send({ notifications, nextCursor })
  })

  app.get(
    '/notifications/summary',
    { preHandler, config: rateLimit(120) },
    async (request, reply) => {
      const userId = request.user.sub
      const unread = await prisma.notification.count({ where: { userId, readAt: null } })
      const pending = await prisma.notification.count({
        where: { userId, actionKey: { not: null }, resolvedAt: null },
      })
      return reply.status(200).send({ unread, pending })
    },
  )

  app.get(
    '/notifications/pending',
    { preHandler, config: rateLimit(60) },
    async (request, reply) => {
      const notifications = await prisma.notification.findMany({
        where: { userId: request.user.sub, actionKey: { not: null }, resolvedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 100,
        select: notificationSelect,
      })
      return reply.status(200).send({ notifications })
    },
  )

  app.patch(
    '/notifications/:id/read',
    { preHandler, config: rateLimit(60) },
    async (request, reply) => {
      let params
      try {
        params = idParamsSchema.parse(request.params)
      } catch (err) {
        if (err instanceof ZodError) return badRequest(reply, err)
        throw err
      }

      const result = await prisma.notification.updateMany({
        where: { id: params.id, userId: request.user.sub },
        data: { readAt: new Date() },
      })
      if (result.count === 0) {
        throw new AppError('Notificação não encontrada', 404)
      }
      return reply.status(204).send()
    },
  )

  app.post(
    '/notifications/read-all',
    { preHandler, config: rateLimit(60) },
    async (request, reply) => {
      await prisma.notification.updateMany({
        where: { userId: request.user.sub, readAt: null },
        data: { readAt: new Date() },
      })
      return reply.status(204).send()
    },
  )
}
