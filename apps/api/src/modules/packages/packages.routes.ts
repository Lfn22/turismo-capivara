import { FastifyInstance } from 'fastify'
import prisma from '../../database'

export async function packagesRoutes(app: FastifyInstance) {
  app.get('/tenants/:slug/packages', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    })

    if (!tenant) {
      return reply.status(404).send({ message: 'Tenant não encontrado' })
    }

    const packages = await prisma.tourPackage.findMany({
      where: {
        tenantId: tenant.id,
        active: true,
      },
      include: {
        departureSlots: {
          where: {
            startsAt: { gte: new Date() },
            status: 'OPEN',
          },
          orderBy: { startsAt: 'asc' },
          take: 5,
        },
      },
    })

    return packages
  })

  app.get('/tenants/:slug/packages/:id', async (request, reply) => {
    const { slug, id } = request.params as { slug: string; id: string }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    })

    if (!tenant) {
      return reply.status(404).send({ message: 'Tenant não encontrado' })
    }

    const tourPackage = await prisma.tourPackage.findFirst({
      where: {
        id,
        tenantId: tenant.id,
      },
      include: {
        departureSlots: {
          where: {
            startsAt: { gte: new Date() },
            status: 'OPEN',
          },
          orderBy: { startsAt: 'asc' },
        },
      },
    })

    if (!tourPackage) {
      return reply.status(404).send({ message: 'Roteiro não encontrado' })
    }

    return tourPackage
  })
}