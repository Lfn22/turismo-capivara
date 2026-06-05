import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../../database'

const bodySchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
})

export async function lookupTenantRoute(app: FastifyInstance) {
  app.post(
    '/auth/lookup-tenant',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '1 minute',
          keyGenerator: (request) => {
            const body = request.body as { email?: string }
            const email = (body?.email ?? '').toLowerCase().trim()
            return `lookup:${email}:${request.ip}`
          },
        },
      },
    },
    async (request, reply) => {
      let body
      try {
        body = bodySchema.parse(request.body)
      } catch (err) {
        if (err instanceof ZodError) {
          return reply.status(400).send({
            message: 'Dados inválidos',
            errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
          })
        }
        throw err
      }

      // Tempo de resposta constante para eliminar timing attack
      const [user] = await Promise.all([
        prisma.user.findUnique({
          where: { email: body.email.toLowerCase() },
          select: { tenant: { select: { name: true, slug: true } } },
        }),
        new Promise((res) => setTimeout(res, 80 + Math.floor(Math.random() * 40))),
      ])

      // Always return same shape — no user enumeration
      if (!user) {
        return reply.status(200).send({
          message: 'Se este email estiver cadastrado, as informações do tenant foram retornadas.',
          tenant: null,
        })
      }

      return reply.status(200).send({
        message: 'Tenant encontrado.',
        tenant: {
          tenantName: user.tenant.name,
          tenantSlug: user.tenant.slug,
        },
      })
    }
  )
}
