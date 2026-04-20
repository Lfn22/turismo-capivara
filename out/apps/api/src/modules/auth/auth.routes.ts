import { FastifyInstance } from 'fastify'
import { compareSync } from 'bcryptjs'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'

const loginBodySchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(1, { message: 'Senha obrigatória' }),
  tenantSlug: z.string().min(1, { message: 'Slug do tenant obrigatório' }),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    let body
    try {
      body = loginBodySchema.parse(request.body)
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
    const { email, password, tenantSlug } = body

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    })

    if (!tenant) {
      throw new AppError('Credenciais inválidas', 401)
    }

    const user = await prisma.user.findFirst({
      where: {
        email,
        tenantId: tenant.id,
      },
    })

    if (!user) {
      throw new AppError('Credenciais inválidas', 401)
    }

    const passwordMatch = compareSync(password, user.password)

    if (!passwordMatch) {
      throw new AppError('Credenciais inválidas', 401)
    }

    const token = await reply.jwtSign(
      {
        sub: user.id,
        tenantId: user.tenantId,
        role: user.role,
        name: user.name,
      },
      { expiresIn: '1d' }
    )

    return reply.status(200).send({ token })
  })
}
