import { FastifyInstance } from 'fastify'
import { compareSync, hashSync } from 'bcryptjs'
import { z, ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { hashCpf } from '../../shared/utils/hash'
import { lookupTenantRoute } from './routes/lookup-tenant'
import { requestPasswordResetRoute } from './routes/request-password-reset'
import { resetPasswordRoute } from './routes/reset-password'

const loginBodySchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(1, { message: 'Senha obrigatória' }),
  tenantSlug: z.string().min(1, { message: 'Slug do tenant obrigatório' }),
})

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

const registerBodySchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('CLIENTE'),
    name: z.string().min(1, { message: 'Nome obrigatório' }),
    email: z.string().email({ message: 'Email inválido' }),
    password: z.string().min(8, { message: 'Senha deve ter no mínimo 8 caracteres' }),
  }),
  z.object({
    role: z.literal('CONDUTOR'),
    name: z.string().min(1, { message: 'Nome obrigatório' }),
    email: z.string().email({ message: 'Email inválido' }),
    password: z.string().min(8, { message: 'Senha deve ter no mínimo 8 caracteres' }),
    cpf: z.string().regex(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos numéricos' }),
  }),
])

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
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
        approvalStatus: user.approvalStatus,
      },
      { expiresIn: '1d' }
    )

    return reply.status(200).send({ token })
  })

  app.post('/tenants/:slug/auth/register', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
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

    let body
    try {
      body = registerBodySchema.parse(request.body)
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

    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.slug },
    })

    if (!tenant) {
      throw new AppError('Tenant não encontrado', 404)
    }

    const hashedPassword = hashSync(body.password, 10)

    try {
      if (body.role === 'CLIENTE') {
        await prisma.user.create({
          data: {
            tenantId: tenant.id,
            name: body.name,
            email: body.email,
            password: hashedPassword,
            role: 'CLIENTE',
          },
          select: { id: true },
        })
      } else {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              tenantId: tenant.id,
              name: body.name,
              email: body.email,
              password: hashedPassword,
              role: 'CONDUTOR',
              cpf: hashCpf(body.cpf),
            },
            select: { id: true },
          })
          await tx.guideProfile.create({
            data: {
              userId: user.id,
              especialidades: [],
              regioes: [],
              portfolioPhotos: [],
            },
          })
        })
      }
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const fields = err.meta?.target as string[] | undefined
        if (fields?.includes('cpf')) {
          throw new AppError('CPF já cadastrado', 409)
        }
        throw new AppError('Email já cadastrado neste tenant', 409)
      }
      throw err
    }

    return reply.status(201).send({ message: 'Conta criada com sucesso' })
  })

  // GET /auth/me — returns verified JWT claims without exposing raw token to client
  // Higher rate limit: this endpoint is called on every authenticated page-load,
  // so the global 20/min cap would block normal usage. 120/min (2/s) is generous
  // yet still protects against credential-stuffing enumeration.
  app.get('/auth/me', { preHandler: [authenticate], config: { rateLimit: { max: 120, timeWindow: '1 minute' } } }, async (request, reply) => {
    const user = request.user as { sub: string; role: string; tenantId: string }
    return reply.status(200).send({
      id: user.sub,
      role: user.role,
      tenantId: user.tenantId,
    })
  })

  await app.register(lookupTenantRoute)
  await app.register(requestPasswordResetRoute)
  await app.register(resetPasswordRoute)
}
