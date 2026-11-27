import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { canEditPackage } from '../../shared/auth/edit-permissions'
import { parseBody, parseParams, parseQuery } from '../../shared/utils/zod-error'
import { approveRequest, cancelRequest, rejectRequest } from './package-requests.service'

export async function packageRequestsRoutes(app: FastifyInstance) {
  app.get(
    '/admin/package-requests',
    { preHandler: [authenticate, authorize(['SUPER_ADMIN'])] },
    async (request, reply) => {
      const { data: query, error } = parseQuery(
        z.object({
          status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).default('PENDING'),
        }),
        request.query,
        reply,
      )
      if (error) return

      const rows = await prisma.packageChangeRequest.findMany({
        where: { status: query.status },
        orderBy: { createdAt: 'asc' },
        include: {
          package: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              extraGuidePrice: true,
              active: true,
              publishedAt: true,
              tenant: { select: { slug: true } },
              destination: { select: { title: true } },
            },
          },
          requestedBy: { select: { id: true, name: true } },
        },
      })

      return {
        requests: rows.map((r) => ({
          id: r.id,
          type: r.type,
          status: r.status,
          createdAt: r.createdAt,
          changes: r.changes,
          package: {
            id: r.package.id,
            name: r.package.name,
            description: r.package.description,
            price: Number(r.package.price),
            extraGuidePrice:
              r.package.extraGuidePrice === null ? null : Number(r.package.extraGuidePrice),
            active: r.package.active,
            publishedAt: r.package.publishedAt,
            tenantSlug: r.package.tenant.slug,
            destinationTitle: r.package.destination?.title ?? null,
          },
          requestedBy: r.requestedBy,
        })),
      }
    },
  )

  const idParams = z.object({ id: z.string().min(1, { message: 'Id obrigatório' }) })

  app.post(
    '/admin/package-requests/:id/approve',
    { preHandler: [authenticate, authorize(['SUPER_ADMIN'])] },
    async (request, reply) => {
      const { data: params, error } = parseParams(idParams, request.params, reply)
      if (error) return
      const approved = await approveRequest(params.id, request.user.sub, request.log)
      return reply.send({ id: approved.id, status: approved.status })
    },
  )

  app.post(
    '/admin/package-requests/:id/reject',
    { preHandler: [authenticate, authorize(['SUPER_ADMIN'])] },
    async (request, reply) => {
      const { data: params, error: paramsError } = parseParams(idParams, request.params, reply)
      if (paramsError) return
      const { data: body, error: bodyError } = parseBody(
        z.object({
          reason: z
            .string({ error: 'Informe o motivo da recusa' })
            .trim()
            .min(5, { message: 'O motivo deve ter ao menos 5 caracteres' })
            .max(500, { message: 'O motivo deve ter no máximo 500 caracteres' }),
        }),
        request.body,
        reply,
      )
      if (bodyError) return
      const rejected = await rejectRequest(params.id, request.user.sub, body.reason)
      return reply.send({ id: rejected.id, status: rejected.status })
    },
  )

  // Guia cancela o próprio pedido pendente
  app.delete(
    '/tenants/:slug/packages/:id/request',
    { preHandler: [authenticate, authorize(['CONDUTOR'])] },
    async (request, reply) => {
      const { data: params, error } = parseParams(
        z.object({ slug: z.string().min(1), id: z.string().min(1) }),
        request.params,
        reply,
      )
      if (error) return

      const pkg = await prisma.tourPackage.findFirst({
        where: { id: params.id, tenant: { slug: params.slug } },
        select: { tenantId: true, conductorId: true },
      })
      if (!pkg) throw new AppError('Roteiro não encontrado', 404)
      if (!canEditPackage(request.user, pkg)) throw new AppError('Acesso negado', 403)

      await cancelRequest(params.id, request.user.sub)
      return reply.status(204).send()
    },
  )
}
