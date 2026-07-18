import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { hashSync } from 'bcryptjs'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { getResend, getEmailFrom } from '../../shared/email'
import { Sentry } from '../../shared/sentry'
import { approvalEmailText } from './emails/approval-email'
import { rejectionEmailText } from './emails/rejection-email'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

const tenantIdParamsSchema = z.object({
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

const signupBodySchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }).trim(),
  slug: z
    .string()
    .min(3, { message: 'Slug deve ter no mínimo 3 caracteres' })
    .max(50, { message: 'Slug deve ter no máximo 50 caracteres' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug deve começar e terminar com letras ou números' }),
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(8, { message: 'Senha deve ter no mínimo 8 caracteres' }),
  cnpj: z.string().min(14, { message: 'CNPJ inválido' }).max(18, { message: 'CNPJ inválido' }),
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


export async function tenantsRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // Existing routes
  // ---------------------------------------------------------------------------

  app.get('/tenants', {
    preHandler: [authenticate, authorize(['ADMIN'])],
  }, async (request) => {
    const user = request.user as { tenantId: string }
    const tenants = await prisma.tenant.findMany({
      where: { id: user.tenantId },
      select: { id: true, name: true, slug: true },
    })
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
      select: { id: true, name: true, slug: true, approvalStatus: true },
    })

    if (!tenant) {
      throw new AppError('Tenant não encontrado', 404)
    }

    return reply.send({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      approvalStatus: tenant.approvalStatus,
    })
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
          data: { name: body.name, slug: body.slug, cnpj: body.cnpj, approvalStatus: 'PENDING' },
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
  }, async (request, reply) => {
    const pendingQuerySchema = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    })
    let query
    try {
      query = pendingQuerySchema.parse(request.query)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError400(err))
      throw err
    }
    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where: { approvalStatus: 'PENDING' },
        select: {
          id: true,
          name: true,
          slug: true,
          cnpj: true,
          approvalStatus: true,
          createdAt: true,
          users: {
            where: { role: 'ADMIN' },
            select: { email: true, name: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.tenant.count({ where: { approvalStatus: 'PENDING' } }),
    ])
    return reply.send({ tenants, total, limit: query.limit, offset: query.offset })
  })

  app.get('/tenants/admin/all', {
    preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
  }, async (request, reply) => {
    const allQuerySchema = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).default(0),
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    })
    let query
    try {
      query = allQuerySchema.parse(request.query)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError400(err))
      throw err
    }
    const where = query.status ? { approvalStatus: query.status } : {}
    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          cnpj: true,
          approvalStatus: true,
          createdAt: true,
          users: {
            where: { role: 'ADMIN' },
            select: { email: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.tenant.count({ where }),
    ])
    return reply.send({ tenants, total, limit: query.limit, offset: query.offset })
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
      select: {
        slug: true,
        approvalStatus: true,
        users: { where: { role: 'ADMIN' }, select: { email: true, name: true } },
      },
    })
    if (!tenant) throw new AppError('Operadora não encontrada', 404)
    if (tenant.approvalStatus !== 'PENDING') {
      throw new AppError('Operadora já foi processada', 409)
    }

    await prisma.tenant.update({
      where: { id: params.id },
      data: { approvalStatus: 'APPROVED' },
      select: { id: true },
    })

    const resend = getResend()
    if (resend && tenant.users[0]) {
      try {
        await resend.emails.send({
          from: getEmailFrom(),
          to: [tenant.users[0].email],
          subject: 'Sua operadora foi aprovada no CAPI',
          text: approvalEmailText({ operatorName: tenant.users[0].name, slug: tenant.slug }),
        })
      } catch (emailErr) {
        // Log but don't fail — DB state is authoritative
        app.log.warn({ err: emailErr }, '[email] Failed to send approval notification')
        Sentry.captureException(emailErr)
      }
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
      select: {
        slug: true,
        approvalStatus: true,
        users: { where: { role: 'ADMIN' }, select: { email: true, name: true } },
      },
    })
    if (!tenant) throw new AppError('Operadora não encontrada', 404)
    if (tenant.approvalStatus !== 'PENDING') {
      throw new AppError('Operadora já foi processada', 409)
    }

    await prisma.tenant.update({
      where: { id: params.id },
      data: { approvalStatus: 'REJECTED', rejectionReason: body.reason },
      select: { id: true },
    })

    const resend = getResend()
    if (resend && tenant.users[0]) {
      try {
        await resend.emails.send({
          from: getEmailFrom(),
          to: [tenant.users[0].email],
          subject: 'Atualização sobre seu cadastro no CAPI',
          text: rejectionEmailText({ operatorName: tenant.users[0].name, rejectionReason: body.reason }),
        })
      } catch (emailErr) {
        // Log but don't fail — DB state is authoritative
        app.log.warn({ err: emailErr }, '[email] Failed to send rejection notification')
        Sentry.captureException(emailErr)
      }
    }

    return reply.send({ message: 'Operadora rejeitada' })
  })

  // GET /tenants/:slug/destination — destino vinculado ao tenant (público)
  app.get('/tenants/:slug/destination', async (request, reply) => {
    let params
    try {
      params = slugParamsSchema.parse(request.params)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError400(err))
      throw err
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.slug },
      select: {
        destination: {
          select: {
            slug: true,
            title: true,
            subtitle: true,
            description: true,
            state: true,
            highlights: true,
            heroImageUrl: true,
            photos: true,
            tagline: true,
          },
        },
      },
    })

    if (!tenant?.destination) throw new AppError('Destino não encontrado', 404)
    return reply.status(200).send(tenant.destination)
  })

  app.patch('/tenants/:id/link-destination', {
    preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
  }, async (request, reply) => {
    let params, body
    try {
      params = z.object({ id: z.string().min(1) }).parse(request.params)
      body = z.object({ destinationId: z.string().nullable() }).parse(request.body)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError400(err))
      throw err
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!tenant) throw new AppError('Operadora não encontrada', 404)

    await prisma.tenant.update({
      where: { id: params.id },
      data: { destinationId: body.destinationId },
      select: { id: true },
    })

    return reply.send({ message: 'Destino vinculado com sucesso' })
  })
}
