import { FastifyInstance } from 'fastify'
import prisma from '../../database'

export async function tenantsRoutes(app: FastifyInstance) {
  app.get('/tenants', async () => {
    const tenants = await prisma.tenant.findMany()
    return tenants
  })

  app.get('/tenants/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    })

    if (!tenant) {
      return reply.status(404).send({ message: 'Tenant não encontrado' })
    }

    return tenant
  })
}