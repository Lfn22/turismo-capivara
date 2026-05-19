import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { hashSync } from 'bcryptjs'
import { Resend } from 'resend'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { approvalEmailText } from './emails/approval-email'
import { rejectionEmailText } from './emails/rejection-email'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

const tenantIdParamsSchema = z.object({
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

const signupBodySchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }),
  slug: z
    .string()
    .min(3, { message: 'Slug deve ter no mínimo 3 caracteres' })
    .max(50, { message: 'Slug deve ter no máximo 50 caracteres' })
    .regex(/^[a-z0-9-]+$/, { message: 'Slug deve conter apenas letras minúsculas, números e hífens' }),
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(8, { message: 'Senha deve ter no mínimo 8 caracteres' }),
})

const rejectBodySchema = z.object({
  reason: z.string().min(1, { message: 'Informe o motivo da rejeição' }),
})

function zodError400(err: ZodError) {
  return {
    message: 'Dados inválidos',
    errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
  }
}

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email delivery')
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

export async function tenantsRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // Existing routes
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // New routes — operator self-service signup
  // ---------------------------------------------------------------------------

  app.post('/tenants/signup', {
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    let body
    try {
      body = signupBodySchema.parse(request.body)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError400(err))
      throw err
    }

    const hashedPassword = hashSync(body.password, 10)

    try {
      await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: { name: body.name, slug: body.slug, approvalStatus: 'PENDING' },
        })
        await tx.user.create({
          data: {
            tenantId: tenant.id,
            name: body.name,
            email: body.email,
            password: hashedPassword,
            role: 'ADMIN',
            approvalStatus: 'APPROVED',
          },
        })
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = err.meta?.target as string[] | undefined
        if (target?.includes('email')) {
          throw new AppError('Email já cadastrado', 409)
        }
        throw new AppError('Slug já em uso', 409)
      }
      throw err
    }

    return reply.status(201).send({ message: 'Operadora cadastrada com sucesso' })
  })

  // ---------------------------------------------------------------------------
  // Slug availability check — public, no auth
  // ---------------------------------------------------------------------------

  app.get('/tenants/check-slug', async (request, reply) => {
    let query
    try {
      query = z.object({ slug: z.string().min(1, { message: 'Slug obrigatório' }) }).parse(request.query)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError400(err))
      throw err
    }
    const existing = await prisma.tenant.findUnique({
      where: { slug: query.slug },
      select: { id: true },
    })
    return reply.send({ available: !existing })
  })

  // ---------------------------------------------------------------------------
  // Admin routes — SUPER_ADMIN only
  // ---------------------------------------------------------------------------

  app.get('/tenants/admin/pending', {
    preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
  }, async (_request, reply) => {
    const tenants = await prisma.tenant.findMany({
      where: { approvalStatus: 'PENDING' },
      include: {
        users: {
          where: { role: 'ADMIN' },
          select: { email: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    return reply.send(tenants)
  })

  app.patch('/tenants/:id/approve', {
    preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
  }, async (request, reply) => {
    let params
    try {
      params = tenantIdParamsSchema.parse(request.params)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError400(err))
      throw err
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: { users: { where: { role: 'ADMIN' }, select: { email: true, name: true } } },
    })
    if (!tenant) throw new AppError('Operadora não encontrada', 404)
    if (tenant.approvalStatus !== 'PENDING') {
      throw new AppError('Operadora já foi processada', 409)
    }

    await prisma.tenant.update({
      where: { id: params.id },
      data: { approvalStatus: 'APPROVED' },
    })

    const resend = getResend()
    if (resend && tenant.users[0]) {
      await resend.emails.send({
        from: 'CAPI <noreply@capi.turismo>',
        to: [tenant.users[0].email],
        subject: 'Sua operadora foi aprovada no CAPI',
        text: approvalEmailText({ operatorName: tenant.users[0].name, slug: tenant.slug }),
      })
    }

    return reply.send({ message: 'Operadora aprovada com sucesso' })
  })

  app.patch('/tenants/:id/reject', {
    preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
  }, async (request, reply) => {
    let params
    let body
    try {
      params = tenantIdParamsSchema.parse(request.params)
      body = rejectBodySchema.parse(request.body)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError400(err))
      throw err
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: { users: { where: { role: 'ADMIN' }, select: { email: true, name: true } } },
    })
    if (!tenant) throw new AppError('Operadora não encontrada', 404)
    if (tenant.approvalStatus !== 'PENDING') {
      throw new AppError('Operadora já foi processada', 409)
    }

    await prisma.tenant.update({
      where: { id: params.id },
      data: { approvalStatus: 'REJECTED', rejectionReason: body.reason },
    })

    const resend = getResend()
    if (resend && tenant.users[0]) {
      await resend.emails.send({
        from: 'CAPI <noreply@capi.turismo>',
        to: [tenant.users[0].email],
        subject: 'Atualização sobre seu cadastro no CAPI',
        text: rejectionEmailText({ operatorName: tenant.users[0].name, rejectionReason: body.reason }),
      })
    }

    return reply.send({ message: 'Operadora rejeitada' })
  })
}
