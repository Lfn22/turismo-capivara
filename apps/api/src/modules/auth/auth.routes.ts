import { FastifyInstance } from 'fastify'
import { compareSync } from 'bcryptjs'
import prisma from '../../database'

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    const { email, password, tenantSlug } = request.body as {
      email: string
      password: string
      tenantSlug: string
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    })

    if (!tenant) {
      return reply.status(401).send({ message: 'Credenciais inválidas' })
    }

    const user = await prisma.user.findFirst({
      where: {
        email,
        tenantId: tenant.id,
      },
    })

    if (!user) {
      return reply.status(401).send({ message: 'Credenciais inválidas' })
    }

    const passwordMatch = compareSync(password, user.password)

    if (!passwordMatch) {
      return reply.status(401).send({ message: 'Credenciais inválidas' })
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