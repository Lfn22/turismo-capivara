import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { getResend } from '../../shared/email'
import { guideApprovedEmailText, guideApprovedSubject } from '../bookings/emails/guide-approved-email'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

const guideIdParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
  id: z.string().min(1, { message: 'ID do guia obrigatório' }),
})

const adminGuidesQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
})

const rejectBodySchema = z.object({
  reason: z.string().min(1, { message: 'Motivo da rejeição obrigatório' }),
})

const updateProfileBodySchema = z.object({
  bio: z.string().optional(),
  photoUrl: z.string().url({ message: 'URL inválida' }).optional().nullable(),
  especialidades: z.array(z.string()).optional(),
  regioes: z.array(z.string()).optional(),
  portfolioPhotos: z.array(z.string().url({ message: 'URL inválida' })).optional(),
})

function zodError(err: ZodError) {
  return {
    message: 'Dados inválidos',
    errors: err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  }
}

export async function guidesRoutes(app: FastifyInstance) {
  // GET /tenants/:slug/guides — PUBLIC: list approved guides
  app.get('/tenants/:slug/guides', async (request, reply) => {
    let params
    try {
      params = slugParamsSchema.parse(request.params)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError(err))
      throw err
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: params.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    const guides = await prisma.guideProfile.findMany({
      where: {
        user: {
          tenantId: tenant.id,
          approvalStatus: 'APPROVED',
        },
      },
      select: {
        id: true,
        bio: true,
        photoUrl: true,
        especialidades: true,
        regioes: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return reply.status(200).send({ guides })
  })

  // GET /tenants/:slug/guides/:id — PUBLIC: single approved guide
  app.get('/tenants/:slug/guides/:id', async (request, reply) => {
    let params
    try {
      params = guideIdParamsSchema.parse(request.params)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError(err))
      throw err
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: params.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    const guide = await prisma.guideProfile.findFirst({
      where: {
        id: params.id,
        user: {
          tenantId: tenant.id,
          approvalStatus: 'APPROVED',
        },
      },
      select: {
        id: true,
        bio: true,
        photoUrl: true,
        especialidades: true,
        regioes: true,
        portfolioPhotos: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!guide) throw new AppError('Guia não encontrado', 404)

    return reply.status(200).send({ guide })
  })

  // GET /tenants/:slug/admin/guides?status=PENDING — ADMIN only
  app.get('/tenants/:slug/admin/guides', {
    preHandler: [authenticate, authorize(['ADMIN'])],
  }, async (request, reply) => {
    const admin = request.user as { sub: string; tenantId: string; role: string }

    let params
    try {
      params = slugParamsSchema.parse(request.params)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError(err))
      throw err
    }

    let query
    try {
      query = adminGuidesQuerySchema.parse(request.query)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError(err))
      throw err
    }

    const guides = await prisma.guideProfile.findMany({
      where: {
        user: {
          tenantId: admin.tenantId,
          role: 'CONDUTOR',
          ...(query.status ? { approvalStatus: query.status } : {}),
        },
      },
      select: {
        id: true,
        bio: true,
        photoUrl: true,
        especialidades: true,
        regioes: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            approvalStatus: true,
            rejectionReason: true,
          },
        },
      },
    })

    return reply.status(200).send({ guides })
  })

  // PATCH /tenants/:slug/admin/guides/:id/approve — ADMIN only
  app.patch('/tenants/:slug/admin/guides/:id/approve', {
    preHandler: [authenticate, authorize(['ADMIN'])],
  }, async (request, reply) => {
    const admin = request.user as { sub: string; tenantId: string; role: string }

    let params
    try {
      params = guideIdParamsSchema.parse(request.params)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError(err))
      throw err
    }

    const guideProfile = await prisma.guideProfile.findFirst({
      where: {
        id: params.id,
        user: {
          tenantId: admin.tenantId,
          role: 'CONDUTOR',
        },
      },
      select: {
        userId: true,
        user: { select: { name: true, email: true } },
      },
    })

    if (!guideProfile) throw new AppError('Guia não encontrado', 404)

    await prisma.user.update({
      where: { id: guideProfile.userId },
      data: { approvalStatus: 'APPROVED', rejectionReason: null },
    })

    // NOTIF-03: Notify guide of account approval (fire-and-forget, D-12)
    const resend = getResend()
    if (resend && guideProfile.user.email) {
      resend.emails
        .send({
          from: 'CAPI <noreply@capi.turismo>',
          to: guideProfile.user.email,
          subject: guideApprovedSubject,
          text: guideApprovedEmailText({ guideName: guideProfile.user.name ?? 'Guia', slug: params.slug }),
        })
        .catch((emailErr: unknown) => {
          app.log.warn({ err: emailErr, guideId: params.id }, '[email] Failed to send guide-approved email')
        })
    }

    return reply.status(200).send({ message: 'Guia aprovado com sucesso' })
  })

  // PATCH /tenants/:slug/admin/guides/:id/reject — ADMIN only
  app.patch('/tenants/:slug/admin/guides/:id/reject', {
    preHandler: [authenticate, authorize(['ADMIN'])],
  }, async (request, reply) => {
    const admin = request.user as { sub: string; tenantId: string; role: string }

    let params
    try {
      params = guideIdParamsSchema.parse(request.params)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError(err))
      throw err
    }

    let body
    try {
      body = rejectBodySchema.parse(request.body)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError(err))
      throw err
    }

    const guideProfile = await prisma.guideProfile.findFirst({
      where: {
        id: params.id,
        user: {
          tenantId: admin.tenantId,
          role: 'CONDUTOR',
        },
      },
      select: { userId: true },
    })

    if (!guideProfile) throw new AppError('Guia não encontrado', 404)

    await prisma.user.update({
      where: { id: guideProfile.userId },
      data: { approvalStatus: 'REJECTED', rejectionReason: body.reason },
    })

    return reply.status(200).send({ message: 'Guia rejeitado' })
  })

  // GET /tenants/:slug/guides/me/bookings — CONDUTOR only
  app.get('/tenants/:slug/guides/me/bookings', {
    preHandler: [authenticate, authorize(['CONDUTOR'])],
  }, async (request, reply) => {
    const conductor = request.user as { sub: string; tenantId: string; role: string }

    let params
    try {
      params = slugParamsSchema.parse(request.params)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError(err))
      throw err
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: params.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)
    if (tenant.id !== conductor.tenantId) throw new AppError('Acesso negado', 403)

    const bookings = await prisma.booking.findMany({
      where: {
        tenantId: tenant.id,
        slot: {
          package: {
            conductorId: conductor.sub,
          },
        },
      },
      include: {
        slot: {
          include: {
            package: {
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const safeBookings = bookings.map(({ customerCpfHash, customerPhone, ...b }) => b)
    return reply.status(200).send({ bookings: safeBookings })
  })

  // PATCH /tenants/:slug/guides/me/profile — CONDUTOR only
  app.patch('/tenants/:slug/guides/me/profile', {
    preHandler: [authenticate, authorize(['CONDUTOR'])],
  }, async (request, reply) => {
    const conductor = request.user as { sub: string; tenantId: string; role: string }

    let params
    try {
      params = slugParamsSchema.parse(request.params)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError(err))
      throw err
    }

    let body
    try {
      body = updateProfileBodySchema.parse(request.body)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError(err))
      throw err
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: params.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)
    if (tenant.id !== conductor.tenantId) throw new AppError('Acesso negado', 403)

    const profile = await prisma.guideProfile.update({
      where: { userId: conductor.sub },
      data: {
        ...(body.bio !== undefined && { bio: body.bio }),
        ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl }),
        ...(body.especialidades !== undefined && { especialidades: body.especialidades }),
        ...(body.regioes !== undefined && { regioes: body.regioes }),
        ...(body.portfolioPhotos !== undefined && { portfolioPhotos: body.portfolioPhotos }),
      },
      select: {
        id: true,
        bio: true,
        photoUrl: true,
        especialidades: true,
        regioes: true,
        portfolioPhotos: true,
      },
    })

    return reply.status(200).send({ profile })
  })
}
