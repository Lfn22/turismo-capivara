import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'

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
  app.get('/tenants/:slug/admin/guides', async (request, reply) => {
    await request.jwtVerify()
    const admin = request.user as { sub: string; tenantId: string; role: string }

    if (admin.role !== 'ADMIN') throw new AppError('Acesso negado', 403)

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

    const tenant = await prisma.tenant.findUnique({ where: { slug: params.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    if (tenant.id !== admin.tenantId) throw new AppError('Acesso negado', 403)

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
  app.patch('/tenants/:slug/admin/guides/:id/approve', async (request, reply) => {
    await request.jwtVerify()
    const admin = request.user as { sub: string; tenantId: string; role: string }

    if (admin.role !== 'ADMIN') throw new AppError('Acesso negado', 403)

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
      select: { userId: true },
    })

    if (!guideProfile) throw new AppError('Guia não encontrado', 404)

    await prisma.user.update({
      where: { id: guideProfile.userId },
      data: { approvalStatus: 'APPROVED', rejectionReason: null },
    })

    return reply.status(200).send({ message: 'Guia aprovado com sucesso' })
  })

  // PATCH /tenants/:slug/admin/guides/:id/reject — ADMIN only
  app.patch('/tenants/:slug/admin/guides/:id/reject', async (request, reply) => {
    await request.jwtVerify()
    const admin = request.user as { sub: string; tenantId: string; role: string }

    if (admin.role !== 'ADMIN') throw new AppError('Acesso negado', 403)

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

    return reply.status(200).send({ bookings })
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
      },
      select: {
        id: true,
        bio: true,
        photoUrl: true,
        especialidades: true,
        regioes: true,
      },
    })

    return reply.status(200).send({ profile })
  })
}
