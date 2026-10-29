import { FastifyInstance } from 'fastify'
import { hashSync } from 'bcryptjs'
import { z, ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { requireSuperAdmin } from '../../shared/middlewares/authorize'

const PLATFORM_TENANT_SLUG = 'capi-platform'

const createBodySchema = z.object({
  name: z.string().min(1, { message: 'Nome obrigatório' }),
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(8, { message: 'Senha deve ter no mínimo 8 caracteres' }),
})

const idParamsSchema = z.object({
  id: z.string().min(1, { message: 'Id obrigatório' }),
})

const adminSelect = { id: true, name: true, email: true, createdAt: true } as const

export async function platformAdminsRoutes(app: FastifyInstance) {
  const preHandler = [authenticate, requireSuperAdmin]

  app.get('/platform-admins', { preHandler }, async (_request, reply) => {
    const admins = await prisma.user.findMany({
      where: { role: 'PLATFORM_ADMIN' },
      select: adminSelect,
      orderBy: { createdAt: 'asc' },
    })
    return reply.status(200).send({ admins })
  })

  app.post('/platform-admins', { preHandler }, async (request, reply) => {
    let body
    try {
      body = createBodySchema.parse(request.body)
    } catch (err) {
      if (err instanceof ZodError) {
        return reply.status(400).send({
          message: 'Dados inválidos',
          errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
        })
      }
      throw err
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: PLATFORM_TENANT_SLUG } })
    if (!tenant) {
      throw new AppError('Tenant da plataforma não encontrado', 500)
    }

    try {
      const admin = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: body.name,
          email: body.email.toLowerCase(),
          password: hashSync(body.password, 10),
          role: 'PLATFORM_ADMIN',
          approvalStatus: 'APPROVED',
        },
        select: adminSelect,
      })
      return reply.status(201).send(admin)
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError('E-mail já cadastrado', 409)
      }
      throw err
    }
  })

  app.delete('/platform-admins/:id', { preHandler }, async (request, reply) => {
    let params
    try {
      params = idParamsSchema.parse(request.params)
    } catch (err) {
      if (err instanceof ZodError) {
        return reply.status(400).send({
          message: 'Dados inválidos',
          errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
        })
      }
      throw err
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true },
    })
    if (!user || user.role !== 'PLATFORM_ADMIN') {
      throw new AppError('Admin não encontrado', 404)
    }

    await prisma.user.delete({ where: { id: params.id } })
    return reply.status(204).send()
  })
}
