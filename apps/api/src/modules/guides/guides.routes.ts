import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { parseBody, parseParams, parseQuery } from '../../shared/utils/zod-error'
import { paginationQuerySchema, paginatedResponse } from '../../shared/utils/pagination'
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

const updateProfileBodySchema = z.object({
  bio: z.string().optional(),
  photoUrl: z.string().url({ message: 'URL inválida' }).optional().nullable(),
  especialidades: z.array(z.string()).optional(),
  regioes: z.array(z.string()).optional(),
  portfolioPhotos: z.array(z.string().url({ message: 'URL inválida' })).optional(),
})


export async function guidesRoutes(app: FastifyInstance) {
  // GET /tenants/:slug/guides — PUBLIC: list approved guides
  app.get('/tenants/:slug/guides', async (request, reply) => {
    const { data: params, error: paramsError } = parseParams(slugParamsSchema, request.params, reply)
    if (paramsError) return

    const tenant = await prisma.tenant.findUnique({ where: { slug: params.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    const { data: pagination, error: pgErr } = parseQuery(paginationQuerySchema, request.query, reply)
    if (pgErr) return

    const guides = await prisma.guideProfile.findMany({
      where: {
        user: {
          tenantId: tenant.id,
          approvalStatus: 'APPROVED',
        },
      },
      take: pagination.limit + 1,
      ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
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

    return reply.status(200).send(paginatedResponse(guides, pagination.limit))
  })

  // GET /tenants/:slug/guides/:id — PUBLIC: single approved guide
  app.get('/tenants/:slug/guides/:id', async (request, reply) => {
    const { data: params, error: paramsError } = parseParams(guideIdParamsSchema, request.params, reply)
    if (paramsError) return

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

    const stats = await prisma.review.aggregate({
      where: { guideId: guide.id, tenantId: tenant.id },
      _avg: { rating: true },
      _count: { id: true },
    })

    return reply.status(200).send({
      guide: {
        ...guide,
        averageRating: stats._avg.rating ? Number(stats._avg.rating.toFixed(1)) : null,
        reviewCount: stats._count.id,
      },
    })
  })

  // GET /tenants/:slug/admin/guides?status=PENDING — ADMIN only
  app.get('/tenants/:slug/admin/guides', {
    preHandler: [authenticate, authorize(['ADMIN'])],
  }, async (request, reply) => {
    const admin = request.user as { sub: string; tenantId: string; role: string }

    const { data: params, error: paramsError } = parseParams(slugParamsSchema, request.params, reply)
    if (paramsError) return

    const { data: query, error: queryError } = parseQuery(adminGuidesQuerySchema, request.query, reply)
    if (queryError) return

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

  // GET /tenants/:slug/guides/me/bookings — CONDUTOR only
  app.get('/tenants/:slug/guides/me/bookings', {
    preHandler: [authenticate, authorize(['CONDUTOR'])],
  }, async (request, reply) => {
    const conductor = request.user as { sub: string; tenantId: string; role: string }

    const { data: params, error: paramsError } = parseParams(slugParamsSchema, request.params, reply)
    if (paramsError) return

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

  // GET /guides — todos os guias aprovados (público)
  app.get('/guides', async (_request, reply) => {
    const guides = await prisma.guideProfile.findMany({
      where: {
        user: {
          role: 'CONDUTOR',
          approvalStatus: 'APPROVED',
        },
      },
      select: {
        id: true,
        photoUrl: true,
        especialidades: true,
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { user: { name: 'asc' } },
    })
    return reply.status(200).send(
      guides.map((g) => ({
        id: g.id,
        name: g.user.name,
        photoUrl: g.photoUrl,
        specialties: g.especialidades,
      }))
    )
  })

  // GET /guides/:id — perfil público de um guia aprovado
  app.get('/guides/:id', async (request, reply) => {
    const guideOnlyIdSchema = z.object({ id: z.string().min(1, { message: 'ID do guia obrigatório' }) })
    const { data: params, error: paramsError } = parseParams(guideOnlyIdSchema, request.params, reply)
    if (paramsError) return

    const guide = await prisma.guideProfile.findFirst({
      where: {
        id: params.id,
        user: { role: 'CONDUTOR', approvalStatus: 'APPROVED' },
      },
      select: {
        id: true,
        bio: true,
        photoUrl: true,
        especialidades: true,
        regioes: true,
        portfolioPhotos: true,
        user: { select: { id: true, name: true } },
      },
    })

    if (!guide) throw new AppError('Guia não encontrado', 404)

    const stats = await prisma.review.aggregate({
      where: { guideId: guide.id },
      _avg: { rating: true },
      _count: { id: true },
    })

    return reply.status(200).send({
      id: guide.id,
      name: guide.user.name,
      bio: guide.bio,
      photoUrl: guide.photoUrl,
      specialties: guide.especialidades,
      regions: guide.regioes,
      portfolioPhotos: guide.portfolioPhotos,
      averageRating: stats._avg.rating ? Number(stats._avg.rating.toFixed(1)) : null,
      reviewCount: stats._count.id,
    })
  })

  // GET /guides/:id/packages — pacotes atendidos por um guia (público)
  app.get('/guides/:id/packages', async (request, reply) => {
    const guideOnlyIdSchema = z.object({ id: z.string().min(1, { message: 'ID do guia obrigatório' }) })
    const { data: params, error: paramsError } = parseParams(guideOnlyIdSchema, request.params, reply)
    if (paramsError) return

    const packageGuides = await prisma.packageGuide.findMany({
      where: {
        guideId: params.id,
        status: 'ACCEPTED',
      },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            price: true,
            durationMinHours: true,
            durationMaxHours: true,
            difficulty: true,
            photos: true,
          },
        },
      },
    })

    return reply.status(200).send(
      packageGuides.map((pg) => ({
        id: pg.package.id,
        name: pg.package.name,
        price: Number(pg.package.price),
        durationMinHours: pg.package.durationMinHours,
        durationMaxHours: pg.package.durationMaxHours,
        difficulty: pg.package.difficulty,
        photos: pg.package.photos,
      }))
    )
  })

  // PATCH /tenants/:slug/guides/me/profile — CONDUTOR only
  app.patch('/tenants/:slug/guides/me/profile', {
    preHandler: [authenticate, authorize(['CONDUTOR'])],
  }, async (request, reply) => {
    const conductor = request.user as { sub: string; tenantId: string; role: string }

    const { data: params, error: paramsError } = parseParams(slugParamsSchema, request.params, reply)
    if (paramsError) return

    const { data: body, error: bodyError } = parseBody(updateProfileBodySchema, request.body, reply)
    if (bodyError) return

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

  // GET /guides/:id/testimonials — depoimentos públicos de um guia
  app.get('/guides/:id/testimonials', async (request, reply) => {
    const guideOnlyIdSchema = z.object({ id: z.string().min(1, { message: 'ID do guia obrigatório' }) })
    const { data: params, error: paramsError } = parseParams(guideOnlyIdSchema, request.params, reply)
    if (paramsError) return

    const guide = await prisma.guideProfile.findFirst({
      where: { id: params.id, user: { approvalStatus: 'APPROVED' } },
      select: { id: true },
    })
    if (!guide) throw new AppError('Guia não encontrado', 404)

    const testimonials = await prisma.testimonial.findMany({
      where: { guideProfileId: params.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, text: true, touristName: true, rating: true, createdAt: true },
    })

    return reply.status(200).send({ testimonials })
  })

  // POST /guides/:id/testimonials — turista deixa depoimento
  app.post(
    '/guides/:id/testimonials',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const guideOnlyIdSchema = z.object({ id: z.string().min(1, { message: 'ID do guia obrigatório' }) })
      const testimonialBodySchema = z.object({
        bookingId: z.string().min(1, { message: 'ID da reserva obrigatório' }),
        customerEmail: z.string().email({ message: 'Email inválido' }),
        text: z.string().min(10, { message: 'Depoimento muito curto' }).max(500, { message: 'Depoimento muito longo' }),
        rating: z.number().int().min(1).max(5).default(5),
      })

      const { data: params, error: paramsError } = parseParams(guideOnlyIdSchema, request.params, reply)
      if (paramsError) return

      const { data: body, error: bodyError } = parseBody(testimonialBodySchema, request.body, reply)
      if (bodyError) return

      const guide = await prisma.guideProfile.findFirst({
        where: { id: params.id, user: { approvalStatus: 'APPROVED' } },
        select: { id: true, userId: true },
      })
      if (!guide) throw new AppError('Guia não encontrado', 404)

      const booking = await prisma.booking.findUnique({
        where: { id: body.bookingId },
        select: {
          id: true,
          customerEmail: true,
          customerName: true,
          status: true,
          slot: {
            select: {
              startsAt: true,
              guideId: true,
              package: { select: { conductorId: true } },
            },
          },
        },
      })

      if (!booking || booking.customerEmail.toLowerCase() !== body.customerEmail.toLowerCase()) {
        throw new AppError('Reserva não encontrada', 404)
      }

      if (booking.status !== 'CONFIRMED' && booking.status !== 'COMPLETED') {
        throw new AppError('BOOKING_NOT_ELIGIBLE', 403)
      }

      if (!booking.slot || booking.slot.startsAt > new Date()) {
        throw new AppError('TOUR_NOT_FINISHED', 403)
      }

      const isGuideOfBooking =
        booking.slot.guideId === guide.id || booking.slot.package?.conductorId === guide.userId
      if (!isGuideOfBooking) {
        throw new AppError('BOOKING_NOT_FOR_THIS_GUIDE', 403)
      }

      try {
        const testimonial = await prisma.testimonial.create({
          data: {
            guideProfileId: params.id,
            bookingId: booking.id,
            text: body.text,
            touristName: booking.customerName,
            rating: body.rating,
          },
          select: { id: true, text: true, touristName: true, rating: true, createdAt: true },
        })

        return reply.status(201).send({ testimonial })
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new AppError('TESTIMONIAL_ALREADY_SUBMITTED', 409)
        }
        throw err
      }
    }
  )
}
