import { FastifyInstance } from 'fastify'
import { parseBody } from '../../../shared/utils/zod-error'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { authenticate } from '../../../shared/middlewares/authenticate'
import { authorize } from '../../../shared/middlewares/authorize'
import { CreateDestinationInput, UpdateDestinationInput } from '../destinations.schemas'
import {
  createDestination,
  deleteDestination,
  updateDestination,
} from '../destinations.service'

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
    { preHandler: [authenticate, authorize(['ADMIN', 'CONDUTOR'])] },
    async (request, reply) => {
      const { data: input, error: inputError } = parseBody(CreateDestinationInput, request.body, reply)
      if (inputError) return

      const userId = request.user.sub
      const tenantId = request.user.tenantId
      const destination = await createDestination(tenantId, userId, input, request.user.role)
      return reply.status(201).send(destination)
    },
  )

  // PATCH /tenants/:slug/destinations/:id — guia edita destino próprio
  app.patch(
    '/tenants/:slug/destinations/:id',
    { preHandler: [authenticate, authorize(['ADMIN', 'CONDUTOR'])] },
    async (request, reply) => {
      const { slug, id } = request.params as { slug: string; id: string }

      // Verificar que o destino pertence ao tenant indicado pelo slug
      const tenant = await prisma.tenant.findUnique({ where: { slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)
      // ADMIN: acesso direto por id (isolamento garantido pela UI); CONDUTOR: exige createdBy no tenant
      const userRole = request.user.role
      const linked = userRole === 'ADMIN'
        ? await prisma.destination.findFirst({ where: { id }, select: { id: true } })
        : await prisma.destination.findFirst({ where: { id, createdBy: { tenant: { slug } } }, select: { id: true } })
      if (!linked) throw new AppError('Destino não encontrado', 404)

      const { data: input, error: inputError } = parseBody(UpdateDestinationInput, request.body, reply)
      if (inputError) return

      const userId = request.user.sub
      const destination = await updateDestination(id, userId, input, userRole)
      return reply.status(200).send(destination)
    },
  )

  // DELETE /tenants/:slug/destinations/:id — guia deleta destino próprio
  app.delete(
    '/tenants/:slug/destinations/:id',
    { preHandler: [authenticate, authorize(['ADMIN', 'CONDUTOR'])] },
    async (request, reply) => {
      const { slug, id } = request.params as { slug: string; id: string }

      // Verificar que o destino pertence ao tenant indicado pelo slug
      const tenant = await prisma.tenant.findUnique({ where: { slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)
      // ADMIN: acesso direto por id; CONDUTOR: exige createdBy no tenant
      const userRole = request.user.role
      const linked = userRole === 'ADMIN'
        ? await prisma.destination.findFirst({ where: { id }, select: { id: true } })
        : await prisma.destination.findFirst({ where: { id, createdBy: { tenant: { slug } } }, select: { id: true } })
      if (!linked) throw new AppError('Destino não encontrado', 404)

      const userId = request.user.sub
      await deleteDestination(id, userId, userRole)
      return reply.status(204).send()
    },
  )
}
