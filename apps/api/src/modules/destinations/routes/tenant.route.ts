import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { parseBody, parseParams } from '../../../shared/utils/zod-error'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { authenticate } from '../../../shared/middlewares/authenticate'
import { authorize } from '../../../shared/middlewares/authorize'
import { canEditDestination, canManageDestinations } from '../../../shared/auth/edit-permissions'
import { assertNoDestinationLinks } from '../destinations.links'
import { CreateDestinationInput, UpdateDestinationInput } from '../destinations.schemas'
import {
  createDestination,
  deleteDestination,
  updateDestination,
} from '../destinations.service'

const slugAndIdParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

export async function tenantDestinationsRoute(app: FastifyInstance) {
  // GET /tenants/:slug/destinations — lista destinos do tenant (ADMIN/CONDUTOR/PLATFORM_ADMIN)
  app.get(
    '/tenants/:slug/destinations',
    { preHandler: [authenticate, authorize(['ADMIN', 'CONDUTOR', 'PLATFORM_ADMIN'])] },
    async (request, reply) => {
      // CONDUTOR vê apenas seus próprios destinos; ADMIN/PLATFORM_ADMIN vê todos
      const whereClause =
        request.user.role === 'CONDUTOR'
          ? { createdById: request.user.sub }
          : { approvalStatus: { in: ['PENDING', 'APPROVED', 'REJECTED'] as ('PENDING' | 'APPROVED' | 'REJECTED')[] } }

      const destinations = await prisma.destination.findMany({
        where: whereClause,
        select: {
          id: true,
          slug: true,
          title: true,
          state: true,
          approvalStatus: true,
          rejectionReason: true,
          createdAt: true,
          createdById: true,
          photos: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      return reply.status(200).send({ destinations })
    },
  )

  // GET /tenants/:slug/destinations/:id — busca destino por ID (ADMIN/CONDUTOR/PLATFORM_ADMIN)
  app.get(
    '/tenants/:slug/destinations/:id',
    { preHandler: [authenticate, authorize(['ADMIN', 'CONDUTOR', 'PLATFORM_ADMIN'])] },
    async (request, reply) => {
      const { id } = request.params as { slug: string; id: string }
      const whereClause =
        request.user.role === 'CONDUTOR'
          ? { id, createdById: request.user.sub }
          : { id }

      const destination = await prisma.destination.findFirst({
        where: whereClause,
        select: {
          id: true,
          slug: true,
          title: true,
          state: true,
          description: true,
          highlights: true,
          photos: true,
          approvalStatus: true,
          rejectionReason: true,
          createdAt: true,
          createdById: true,
        },
      })

      if (!destination) throw new AppError('Destino não encontrado', 404)
      return reply.status(200).send(destination)
    },
  )

  // POST /tenants/:slug/destinations — guia cria destino (ADMIN/CONDUTOR)
  app.post(
    '/tenants/:slug/destinations',
    { preHandler: [authenticate, authorize(['ADMIN', 'SUPER_ADMIN'])] },
    async (request, reply) => {
      const { data: input, error: inputError } = parseBody(CreateDestinationInput, request.body, reply)
      if (inputError) return

      const userId = request.user.sub
      const tenantId = request.user.tenantId
      const destination = await createDestination(tenantId, userId, input, request.user.role)
      return reply.status(201).send(destination)
    },
  )

  // PATCH /tenants/:slug/destinations/:id — quem pode editar (edit-permissions) ou o tenant
  // criador enquanto a proposta ainda não foi aprovada (fluxo de moderação)
  app.patch(
    '/tenants/:slug/destinations/:id',
    { preHandler: [authenticate, authorize(['ADMIN', 'SUPER_ADMIN'])] },
    async (request, reply) => {
      const { data: params, error: paramsError } = parseParams(slugAndIdParamsSchema, request.params, reply)
      if (paramsError) return
      const { id } = params

      const destination = await findDestination(id)
      if (!destination) throw new AppError('Destino não encontrado', 404)
      if (!(await canEditDestination(request.user, id)) && !isOwnProposal(destination, request.user.tenantId)) {
        throw new AppError('Não autorizado', 403)
      }

      const { data: input, error: inputError } = parseBody(UpdateDestinationInput, request.body, reply)
      if (inputError) return

      const updated = await updateDestination(id, request.user.sub, input, request.user.role)
      return reply.status(200).send(updated)
    },
  )

  // DELETE /tenants/:slug/destinations/:id — equipe (sem vínculos) ou o tenant criador
  // enquanto a proposta não foi aprovada e não tem vínculos
  app.delete(
    '/tenants/:slug/destinations/:id',
    { preHandler: [authenticate, authorize(['ADMIN', 'SUPER_ADMIN'])] },
    async (request, reply) => {
      const { data: params, error: paramsError } = parseParams(slugAndIdParamsSchema, request.params, reply)
      if (paramsError) return
      const { id } = params

      const destination = await findDestination(id)
      if (!destination) throw new AppError('Destino não encontrado', 404)
      if (!canManageDestinations(request.user) && !isOwnProposal(destination, request.user.tenantId)) {
        throw new AppError('Não autorizado', 403)
      }

      await assertNoDestinationLinks(id)
      await deleteDestination(id, request.user.sub, request.user.role)
      return reply.status(204).send()
    },
  )
}

async function findDestination(id: string) {
  return prisma.destination.findUnique({
    where: { id },
    select: { id: true, approvalStatus: true, createdBy: { select: { tenantId: true } } },
  })
}

// Proposta de destino ainda não aprovada, criada por alguém do tenant de quem pede
function isOwnProposal(
  d: { approvalStatus: string; createdBy: { tenantId: string } | null },
  tenantId: string,
) {
  return d.approvalStatus !== 'APPROVED' && d.createdBy?.tenantId === tenantId
}
