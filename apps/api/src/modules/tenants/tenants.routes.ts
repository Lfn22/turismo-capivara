import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

export async function tenantsRoutes(app: FastifyInstance) {
  app.get('/tenants', {
    preHandler: [authenticate, authorize(['ADMIN'])],
  }, async () => {
    const tenants = await prisma.tenant.findMany()
    return tenants
  })

  app.get('/tenants/:slug', async (request, reply) => {
    let params
    try {
      params = slugParamsSchema.parse(request.params)
    } catch (err) {
      if (err instanceof ZodError) {
        return reply.status(400).send({
          message: 'Dados inválidos',
          errors: err.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        })
      }
      throw err
    }
    const { slug } = params

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    })

    if (!tenant) {
      throw new AppError('Tenant não encontrado', 404)
    }

    return tenant
  })
}
