import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../database'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { AppError } from '../../shared/errors/AppError'
import { parseQuery, parseParams, parseBody } from '../../shared/utils/zod-error'
import { paginationQuerySchema, paginatedResponse } from '../../shared/utils/pagination'
import { resolveReviewGuideProfileId } from '../reviews/review-guide'
import { httpsUrlSchema } from '../../shared/utils/image-url'

const listQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['upcoming', 'past']).optional(),
})

const bookingParamsSchema = z.object({
  id: z.string().min(1),
})

const favoriteParamsSchema = z.object({
  id: z.string().min(1),
})

const createFavoriteBodySchema = z
  .object({
    packageId: z.string().min(1).optional(),
    destinationId: z.string().min(1).optional(),
  })
  .refine((d) => Boolean(d.packageId) !== Boolean(d.destinationId), {
    message: 'Informe packageId ou destinationId (apenas um)',
  })

const createReviewBodySchema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

const updateProfileBodySchema = z.object({
  name: z.string().min(1, { message: 'Nome obrigatório' }).optional(),
  photoUrl: httpsUrlSchema().nullable().optional(),
})

const UPCOMING_STATUSES = ['CONFIRMED', 'PENDING', 'CHECKED_IN'] as const
const PAST_STATUSES = ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'] as const

export async function meRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)
  app.addHook('onRequest', authorize(['CLIENTE']))

  app.get('/me/bookings', async (request, reply) => {
    const parsed = parseQuery(listQuerySchema, request.query, reply)
    if (parsed.error) return

    const { cursor, limit, status } = parsed.data
    const user = request.user

    const statusFilter = status === 'past' ? [...PAST_STATUSES] : [...UPCOMING_STATUSES]

    const rows = await prisma.booking.findMany({
      where: {
        userId: user.sub,
        status: { in: statusFilter },
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        status: true,
        pax: true,
        guides: true,
        isPrivate: true,
        createdAt: true,
        slot: {
          select: {
            startsAt: true,
            package: {
              select: {
                id: true,
                name: true,
                photos: true,
                duration: true,
                difficulty: true,
              },
            },
          },
        },
        tenant: { select: { slug: true, name: true } },
      },
    })

    const { data, nextCursor, hasMore } = paginatedResponse(rows, limit)

    return reply.send({
      data: data.map((b) => ({
        id: b.id,
        code: b.code,
        status: b.status,
        pax: b.pax,
        guides: b.guides,
        isPrivate: b.isPrivate,
        startsAt: b.slot.startsAt,
        packageId: b.slot.package.id,
        packageName: b.slot.package.name,
        coverImageUrl: b.slot.package.photos[0] ?? null,
        durationHours: b.slot.package.duration,
        difficulty: b.slot.package.difficulty,
        tenantSlug: b.tenant.slug,
        tenantName: b.tenant.name,
        createdAt: b.createdAt,
      })),
      nextCursor,
      hasMore,
    })
  })

  app.get('/me/favorites', async (request, reply) => {
    const parsed = parseQuery(paginationQuerySchema, request.query, reply)
    if (parsed.error) return

    const { cursor, limit } = parsed.data
    const user = request.user

    const rows = await prisma.favorite.findMany({
      where: { userId: user.sub },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        packageId: true,
        destinationId: true,
        createdAt: true,
        package: {
          select: {
            id: true,
            name: true,
            photos: true,
            price: true,
            duration: true,
            difficulty: true,
            active: true,
            publishedAt: true,
            tenant: { select: { slug: true } },
          },
        },
        destination: {
          select: {
            id: true,
            title: true,
            slug: true,
            heroImageUrl: true,
            state: true,
            active: true,
            approvalStatus: true,
          },
        },
      },
    })

    const { data, nextCursor, hasMore } = paginatedResponse(rows, limit)

    return reply.send({
      data: data.map((f) => ({
        id: f.id,
        type: f.packageId ? 'package' : 'destination',
        // Saiu do ar depois de favoritado (arquivado, despublicado, destino não aprovado)
        available: f.package
          ? f.package.active && f.package.publishedAt !== null
          : !!f.destination && f.destination.active && f.destination.approvalStatus === 'APPROVED',
        packageId: f.packageId,
        destinationId: f.destinationId,
        packageName: f.package?.name ?? null,
        packageCoverUrl: f.package?.photos[0] ?? null,
        packagePrice: f.package ? Number(f.package.price) : null,
        packageDuration: f.package?.duration ?? null,
        packageDifficulty: f.package?.difficulty ?? null,
        packageTenantSlug: f.package?.tenant.slug ?? null,
        destinationTitle: f.destination?.title ?? null,
        destinationSlug: f.destination?.slug ?? null,
        destinationImageUrl: f.destination?.heroImageUrl ?? null,
        destinationState: f.destination?.state ?? null,
        createdAt: f.createdAt,
      })),
      nextCursor,
      hasMore,
    })
  })

  app.post('/me/favorites', async (request, reply) => {
    const parsed = parseBody(createFavoriteBodySchema, request.body, reply)
    if (parsed.error) return

    const { packageId, destinationId } = parsed.data
    const user = request.user

    // Só o que está público: id inexistente virava 500 (FK) e rascunho podia ser favoritado
    if (packageId) {
      const pkg = await prisma.tourPackage.findFirst({
        where: { id: packageId, active: true, publishedAt: { not: null } },
        select: { id: true },
      })
      if (!pkg) throw new AppError('Roteiro não encontrado', 404)
    } else {
      const dest = await prisma.destination.findFirst({
        where: { id: destinationId, active: true, approvalStatus: 'APPROVED' },
        select: { id: true },
      })
      if (!dest) throw new AppError('Destino não encontrado', 404)
    }

    try {
      const favorite = await prisma.favorite.create({
        data: { userId: user.sub, packageId, destinationId },
      })
      return reply.status(201).send({ id: favorite.id })
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new AppError('Já está nos favoritos', 409)
      }
      throw err
    }
  })

  app.delete('/me/favorites/:id', async (request, reply) => {
    const parsed = parseParams(favoriteParamsSchema, request.params, reply)
    if (parsed.error) return

    const { id } = parsed.data
    const user = request.user

    const favorite = await prisma.favorite.findFirst({ where: { id } })

    if (!favorite || favorite.userId !== user.sub) {
      throw new AppError('Favorito não encontrado', 404)
    }

    await prisma.favorite.delete({ where: { id } })
    return reply.status(204).send()
  })

  app.get('/me/bookings/:id', async (request, reply) => {
    const parsed = parseParams(bookingParamsSchema, request.params, reply)
    if (parsed.error) return

    const { id } = parsed.data
    const user = request.user

    const booking = await prisma.booking.findFirst({
      where: { id },
      select: {
        id: true,
        code: true,
        status: true,
        pax: true,
        qrCode: true,
        paymentUrl: true,
        expiresAt: true,
        createdAt: true,
        userId: true,
        slot: {
          select: {
            startsAt: true,
            capacity: true,
            booked: true,
            package: {
              select: {
                id: true,
                name: true,
                photos: true,
                duration: true,
                difficulty: true,
                meetingPointName: true,
                meetingPointLat: true,
                meetingPointLng: true,
                conductor: {
                  select: {
                    name: true,
                    guideProfile: { select: { photoUrl: true } },
                  },
                },
              },
            },
          },
        },
        tenant: { select: { slug: true, name: true } },
        review: { select: { id: true } },
        voucher: { select: { id: true } },
      },
    })

    if (!booking || booking.userId !== user.sub) {
      throw new AppError('Reserva não encontrada', 404)
    }

    return reply.send({
      id: booking.id,
      code: booking.code,
      status: booking.status,
      pax: booking.pax,
      qrCode: booking.qrCode,
      paymentUrl: booking.paymentUrl,
      expiresAt: booking.expiresAt,
      createdAt: booking.createdAt,
      startsAt: booking.slot.startsAt,
      packageId: booking.slot.package.id,
      packageName: booking.slot.package.name,
      coverImageUrl: booking.slot.package.photos[0] ?? null,
      durationHours: booking.slot.package.duration,
      difficulty: booking.slot.package.difficulty,
      meetingPointName: booking.slot.package.meetingPointName,
      meetingPointLat: booking.slot.package.meetingPointLat,
      meetingPointLng: booking.slot.package.meetingPointLng,
      conductor: booking.slot.package.conductor
        ? {
            name: booking.slot.package.conductor.name,
            photoUrl: booking.slot.package.conductor.guideProfile?.photoUrl ?? null,
          }
        : null,
      tenantSlug: booking.tenant.slug,
      tenantName: booking.tenant.name,
      hasReview: booking.review !== null,
      voucherId: booking.voucher?.id ?? null,
    })
  })

  app.post('/me/reviews', async (request, reply) => {
    const parsed = parseBody(createReviewBodySchema, request.body, reply)
    if (parsed.error) return

    const { bookingId, rating, comment } = parsed.data
    const user = request.user

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId: user.sub },
      select: {
        id: true,
        status: true,
        tenantId: true,
        customerName: true,
        customerEmail: true,
        review: { select: { id: true } },
        slot: {
          select: {
            guideId: true,
            package: {
              select: { conductorId: true },
            },
          },
        },
      },
    })

    if (!booking) {
      throw new AppError('Reserva não encontrada', 404)
    }

    if (booking.status !== 'COMPLETED') {
      throw new AppError('Reserva não concluída', 422)
    }

    if (booking.review) {
      throw new AppError('Avaliação já existe para esta reserva', 409)
    }

    // Guia do slot (roteiro multi-guia / da agência) ou o condutor do roteiro
    const guideProfileId = await resolveReviewGuideProfileId(booking.slot)
    if (!guideProfileId) {
      throw new AppError('Guia não encontrado', 404)
    }

    const review = await prisma.review.create({
      data: {
        tenantId: booking.tenantId,
        bookingId: booking.id,
        guideId: guideProfileId,
        rating,
        comment,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
      },
    })

    return reply.status(201).send(review)
  })

  app.get('/me/reviews', async (request, reply) => {
    const parsed = parseQuery(paginationQuerySchema, request.query, reply)
    if (parsed.error) return

    const { cursor, limit } = parsed.data
    const user = request.user

    const rows = await prisma.review.findMany({
      where: { booking: { userId: user.sub } },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        bookingId: true,
        rating: true,
        comment: true,
        createdAt: true,
        booking: {
          select: {
            slot: {
              select: {
                package: {
                  select: { name: true, photos: true },
                },
              },
            },
          },
        },
      },
    })

    const { data, nextCursor, hasMore } = paginatedResponse(rows, limit)

    return reply.send({
      data: data.map((r) => ({
        id: r.id,
        bookingId: r.bookingId,
        rating: r.rating,
        comment: r.comment,
        packageName: r.booking.slot.package.name,
        packageCoverUrl: r.booking.slot.package.photos[0] ?? null,
        createdAt: r.createdAt,
      })),
      nextCursor,
      hasMore,
    })
  })

  app.get('/me/profile', async (request, reply) => {
    const user = request.user

    const profile = await prisma.user.findUnique({
      where: { id: user.sub },
      select: { id: true, name: true, email: true, photoUrl: true, cpf: true, createdAt: true },
    })

    return reply.send(profile)
  })

  app.patch('/me/profile', async (request, reply) => {
    const parsed = parseBody(updateProfileBodySchema, request.body, reply)
    if (parsed.error) return

    const { name, photoUrl } = parsed.data
    const user = request.user

    const updated = await prisma.user.update({
      where: { id: user.sub },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(photoUrl !== undefined ? { photoUrl } : {}),
      },
      select: { id: true, name: true, email: true, photoUrl: true, cpf: true, createdAt: true },
    })

    return reply.send(updated)
  })
}
