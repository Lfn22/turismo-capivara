import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { parseBody, parseParams, parseQuery } from '../../shared/utils/zod-error'
import { paginationQuerySchema, paginatedResponse } from '../../shared/utils/pagination'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { resolveReviewGuideProfileId, isUniqueViolation } from './review-guide'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

const guideReviewsParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
  guideId: z.string().min(1, { message: 'ID do guia obrigatório' }),
})

const createReviewBodySchema = z.object({
  bookingId: z.string().min(1, { message: 'ID da reserva obrigatório' }),
  rating: z
    .number()
    .int()
    .min(1, { message: 'Nota mínima é 1' })
    .max(5, { message: 'Nota máxima é 5' }),
  comment: z.string().max(1000, { message: 'Comentário muito longo' }).optional(),
  customerName: z.string().min(1, { message: 'Nome obrigatório' }),
  customerEmail: z.string().email({ message: 'Email inválido' }),
})

export async function reviewsRoutes(app: FastifyInstance) {
  // POST /tenants/:slug/reviews — Create a review (public, verified by email)
  app.post(
    '/tenants/:slug/reviews',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 hour',
        },
      },
    },
    async (request, reply) => {
      const { data: params, error: paramsError } = parseParams(
        slugParamsSchema,
        request.params,
        reply,
      )
      if (paramsError) return

      const { data: body, error: bodyError } = parseBody(
        createReviewBodySchema,
        request.body,
        reply,
      )
      if (bodyError) return

      const tenant = await prisma.tenant.findUnique({ where: { slug: params.slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)

      const booking = await prisma.booking.findFirst({
        where: {
          id: body.bookingId,
          tenantId: tenant.id,
        },
        select: {
          id: true,
          status: true,
          customerEmail: true,
          slot: {
            select: {
              startsAt: true,
              guideId: true,
              package: {
                select: { conductorId: true },
              },
            },
          },
        },
      })

      if (!booking) throw new AppError('Reserva não encontrada', 404)

      if (!['COMPLETED', 'CONFIRMED'].includes(booking.status)) {
        throw new AppError('Só é possível avaliar reservas concluídas', 422)
      }

      if (booking.customerEmail.toLowerCase() !== body.customerEmail.toLowerCase()) {
        throw new AppError('Email não corresponde ao da reserva', 403)
      }

      // Só depois do passeio (CONFIRMED também é aceito, mas o passeio precisa ter ocorrido)
      if (booking.slot.startsAt.getTime() > Date.now()) {
        throw new AppError('Só é possível avaliar depois do passeio', 422)
      }

      // Guia do slot (GuideProfile.id) ou perfil do condutor do roteiro
      const guideProfileId = await resolveReviewGuideProfileId(booking.slot)
      if (!guideProfileId) throw new AppError('Guia não encontrado para esta reserva', 404)

      // Check if already reviewed
      const existing = await prisma.review.findUnique({ where: { bookingId: body.bookingId } })
      if (existing) throw new AppError('Esta reserva já foi avaliada', 409)

      let review
      try {
        review = await prisma.review.create({
          data: {
            tenantId: tenant.id,
            bookingId: body.bookingId,
            guideId: guideProfileId,
            rating: body.rating,
            comment: body.comment,
            customerName: body.customerName,
            customerEmail: body.customerEmail,
          },
          select: {
            id: true,
            rating: true,
            comment: true,
            customerName: true,
            createdAt: true,
          },
        })
      } catch (err) {
        // Duas avaliações concorrentes da mesma reserva: a 2ª bate no unique
        if (isUniqueViolation(err)) throw new AppError('Esta reserva já foi avaliada', 409)
        throw err
      }

      return reply.status(201).send({ review })
    },
  )

  // GET /tenants/:slug/guides/:guideId/reviews — Public: list reviews for a guide
  app.get('/tenants/:slug/guides/:guideId/reviews', async (request, reply) => {
    const { data: params, error: paramsError } = parseParams(
      guideReviewsParamsSchema,
      request.params,
      reply,
    )
    if (paramsError) return

    const tenant = await prisma.tenant.findUnique({ where: { slug: params.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    // Mesmo critério do perfil público: guia suspenso/rejeitado não tem página nem avaliações
    const guide = await prisma.guideProfile.findFirst({
      where: { id: params.guideId, user: { approvalStatus: 'APPROVED' } },
      select: { id: true },
    })
    if (!guide) throw new AppError('Guia não encontrado', 404)

    const { data: pagination, error: pgErr } = parseQuery(
      paginationQuerySchema,
      request.query,
      reply,
    )
    if (pgErr) return

    const reviews = await prisma.review.findMany({
      where: {
        tenantId: tenant.id,
        guideId: params.guideId,
      },
      take: pagination.limit + 1,
      ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        customerName: true,
        createdAt: true,
      },
    })

    // Compute average
    const stats = await prisma.review.aggregate({
      where: {
        tenantId: tenant.id,
        guideId: params.guideId,
      },
      _avg: { rating: true },
      _count: { id: true },
    })

    return reply.status(200).send({
      ...paginatedResponse(reviews, pagination.limit),
      averageRating: stats._avg.rating ? Number(stats._avg.rating.toFixed(1)) : null,
      reviewCount: stats._count.id,
    })
  })

  // GET /tenants/:slug/reviews — Admin: list all tenant reviews (authenticated)
  app.get(
    '/tenants/:slug/reviews',
    {
      preHandler: [authenticate, authorize(['ADMIN'])],
    },
    async (request, reply) => {
      const admin = request.user as { sub: string; tenantId: string }

      const { data: params, error: paramsError } = parseParams(
        slugParamsSchema,
        request.params,
        reply,
      )
      if (paramsError) return

      const { data: pagination, error: pgErr } = parseQuery(
        paginationQuerySchema,
        request.query,
        reply,
      )
      if (pgErr) return

      const reviews = await prisma.review.findMany({
        where: { tenantId: admin.tenantId },
        take: pagination.limit + 1,
        ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rating: true,
          comment: true,
          customerName: true,
          customerEmail: true,
          createdAt: true,
          guide: {
            select: {
              id: true,
              user: { select: { name: true } },
            },
          },
        },
      })

      return reply.status(200).send(paginatedResponse(reviews, pagination.limit))
    },
  )
}
