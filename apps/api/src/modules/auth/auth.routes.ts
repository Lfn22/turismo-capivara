import { FastifyInstance } from 'fastify'
import { compareSync, hashSync } from 'bcryptjs'
import { z } from 'zod'
import { parseBody, parseParams } from '../../shared/utils/zod-error'
import { Prisma } from '@prisma/client'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { hashCpf } from '../../shared/utils/hash'
import { createRefreshToken, rotateRefreshToken, revokeAllUserTokens, ACCESS_TOKEN_EXPIRY } from './token.service'
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
    cadastur: z.string().optional(),
  }),
])

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { data: body, error: bodyError } = parseBody(loginBodySchema, request.body, reply)
    if (bodyError) return
    const { email, password, tenantSlug } = body

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    })

    if (!tenant) {
      throw new AppError('Credenciais inválidas', 401)
    }

    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        tenantId: tenant.id,
      },
      select: { id: true, tenantId: true, role: true, name: true, approvalStatus: true, password: true },
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
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    )

    const refreshToken = await createRefreshToken(user.id, user.tenantId)

    return reply.status(200).send({ token, refreshToken })
  })

  app.post('/tenants/:slug/auth/register', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { data: params, error: paramsError } = parseParams(slugParamsSchema, request.params, reply)
    if (paramsError) return

    const { data: body, error: bodyError } = parseBody(registerBodySchema, request.body, reply)
    if (bodyError) return

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
            email: body.email.toLowerCase(),
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
              email: body.email.toLowerCase(),
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
              cadastur: body.role === 'CONDUTOR' ? body.cadastur : undefined,
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
        throw new AppError('Não foi possível criar a conta', 409)
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

  // POST /auth/register-independent — registro de guia sem operadora (aprovado pelo super-admin)
  app.post('/auth/register-independent', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const independentBodySchema = z.object({
      name: z.string().min(1, { message: 'Nome obrigatório' }),
      email: z.string().email({ message: 'Email inválido' }),
      password: z.string().min(8, { message: 'Senha deve ter no mínimo 8 caracteres' }),
      cpf: z.string().regex(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos numéricos' }),
      cadastur: z.string().min(1, { message: 'Número CADASTUR obrigatório' }),
    })

    const { data: body, error: bodyError } = parseBody(independentBodySchema, request.body, reply)
    if (bodyError) return

    // Garante que o tenant "independente" existe
    let systemTenant = await prisma.tenant.findFirst({ where: { slug: 'independente' } })
    if (!systemTenant) {
      systemTenant = await prisma.tenant.create({
        data: { slug: 'independente', name: 'Guias Independentes' },
      })
    }

    const hashedPassword = hashSync(body.password, 10)

    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            tenantId: systemTenant!.id,
            name: body.name,
            email: body.email.toLowerCase(),
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
            cadastur: body.cadastur,
          },
        })
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const fields = err.meta?.target as string[] | undefined
        if (fields?.includes('cpf')) throw new AppError('CPF já cadastrado', 409)
        throw new AppError('Não foi possível criar a conta', 409)
      }
      throw err
    }

    return reply.status(201).send({ message: 'Conta criada com sucesso. Aguarde aprovação.' })
  })

  app.post('/auth/refresh', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string }
    if (!refreshToken) throw new AppError('Refresh token obrigatório', 400)

    const result = await rotateRefreshToken(refreshToken)
    if (!result) throw new AppError('Token inválido ou expirado', 401)

    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { id: true, role: true, tenantId: true, name: true, approvalStatus: true },
    })
    if (!user) throw new AppError('Usuário não encontrado', 401)

    const accessToken = await reply.jwtSign(
      { sub: user.id, tenantId: user.tenantId, role: user.role, name: user.name, approvalStatus: user.approvalStatus },
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    )

    return reply.send({ token: accessToken, refreshToken: result.newToken })
  })

  app.post('/auth/logout', { preHandler: [authenticate] }, async (request, reply) => {
    await revokeAllUserTokens((request.user as { sub: string }).sub)
    return reply.status(204).send()
  })

  await app.register(lookupTenantRoute)
  await app.register(requestPasswordResetRoute)
  await app.register(resetPasswordRoute)
}
