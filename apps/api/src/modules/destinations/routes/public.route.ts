import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { parseParams, parseQuery } from '../../../shared/utils/zod-error'
import { paginationQuerySchema, paginatedResponse } from '../../../shared/utils/pagination'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

export async function publicDestinationsRoute(app: FastifyInstance) {
  // GET /destinations — lista destinos aprovados (público)
  app.get('/destinations', async (request, reply) => {
    const destinationQuerySchema = paginationQuerySchema.extend({
      state: z.string().length(2).optional(),
      search: z.string().min(1).max(100).optional(),
      sortBy: z.enum(['newest', 'name']).optional().default('newest'),
    })

    const { data: query, error: queryErr } = parseQuery(destinationQuerySchema, request.query, reply)
    if (queryErr) return
    const { state, search, sortBy, cursor, limit } = query

    const orderBy = sortBy === 'name' ? { title: 'asc' as const } : { createdAt: 'desc' as const }

    const destinations = await prisma.destination.findMany({
      where: {
        active: true,
        approvalStatus: 'APPROVED',
        ...(state ? { state } : {}),
        ...(search
          ? { OR: [{ title: { contains: search, mode: 'insensitive' as const } }, { description: { contains: search, mode: 'insensitive' as const } }] }
          : {}),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        state: true,
        heroImageUrl: true,
        heroImageBlurDataUrl: true,
        photos: true,
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy,
    })

    return reply.status(200).send(paginatedResponse(destinations, limit))
  })

  // GET /destinations/:slug — detalhe de um destino (público)
  app.get('/destinations/:slug', async (request, reply) => {
    const { data: params, error: paramsError } = parseParams(slugParamsSchema, request.params, reply)
    if (paramsError) return

    const destination = await prisma.destination.findUnique({
      where: { slug: params.slug, active: true },
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        description: true,
        state: true,
        highlights: true,
        heroImageUrl: true,
        heroImageBlurDataUrl: true,
        photos: true,
        tagline: true,
        approvalStatus: true,
        lat: true,
        lng: true,
      },
    })

    if (!destination) throw new AppError('Destino não encontrado', 404)
    if (destination.approvalStatus !== 'APPROVED') throw new AppError('Destino não encontrado', 404)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { approvalStatus: _status, ...publicDestination } = destination
    return reply.status(200).send(publicDestination)
  })

  // GET /destinations/:slug/guides — guias aprovados do destino (público)
  app.get('/destinations/:slug/guides', async (request, reply) => {
    const { data: params, error: paramsError } = parseParams(slugParamsSchema, request.params, reply)
    if (paramsError) return

    const destination = await prisma.destination.findUnique({
      where: { slug: params.slug, active: true },
      select: { id: true },
    })

    if (!destination) throw new AppError('Destino não encontrado', 404)

    const guides = await prisma.guideProfile.findMany({
      where: {
        user: {
          role: 'CONDUTOR',
          approvalStatus: 'APPROVED',
          tenant: {
            destinationId: destination.id,
          },
        },
      },
      select: {
        id: true,
        photoUrl: true,
        especialidades: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    })

    const response = guides.map((g) => ({
      id: g.id,
      name: g.user.name,
      photoUrl: g.photoUrl,
      photoBlurDataUrl: null,
      specialties: g.especialidades,
      packageCount: 0, // TODO: contar TourPackages ativos por guia
      rating: null,
      reviewCount: null,
    }))

    return reply.status(200).send(response)
  })

  // GET /destinations/:slug/guides/:guideId — perfil completo de um guia (público)
  app.get('/destinations/:slug/guides/:guideId', async (request, reply) => {
    const guideParamsSchema = z.object({
      slug: z.string().min(1),
      guideId: z.string().min(1),
    })
    const { data: params, error: paramsError } = parseParams(guideParamsSchema, request.params, reply)
    if (paramsError) return

    const destination = await prisma.destination.findUnique({
      where: { slug: params.slug, active: true },
      select: { id: true },
    })

    if (!destination) throw new AppError('Destino não encontrado', 404)

    const guide = await prisma.guideProfile.findFirst({
      where: {
        id: params.guideId,
        user: {
          role: 'CONDUTOR',
          approvalStatus: 'APPROVED',
          tenant: { destinationId: destination.id },
        },
      },
      select: {
        id: true,
        photoUrl: true,
        bio: true,
        especialidades: true,
        regioes: true,
        portfolioPhotos: true,
        user: {
          select: {
            name: true,
            tenant: { select: { slug: true } },
            tourPackages: {
              where: { active: true },
              select: {
                id: true,
                name: true,
                description: true,
                duration: true,
                price: true,
                difficulty: true,
                departureSlots: {
                  where: {
                    startsAt: { gte: new Date() },
                    status: 'OPEN',
                  },
                  select: {
                    id: true,
                    startsAt: true,
                    capacity: true,
                    booked: true,
                    status: true,
                  },
                  orderBy: { startsAt: 'asc' },
                  take: 5,
                },
              },
              orderBy: { price: 'asc' },
            },
          },
        },
      },
    })

    if (!guide) throw new AppError('Guia não encontrado', 404)

    return reply.status(200).send({
      id: guide.id,
      name: guide.user.name,
      photoUrl: guide.photoUrl,
      bio: guide.bio,
      specialties: guide.especialidades,
      regions: guide.regioes,
      portfolioPhotos: guide.portfolioPhotos,
      tenantSlug: guide.user.tenant.slug,
      packages: guide.user.tourPackages.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        duration: p.duration,
        price: Number(p.price),
        difficulty: p.difficulty,
        departureSlots: p.departureSlots.map((s) => ({
          id: s.id,
          startsAt: s.startsAt,
          capacity: s.capacity,
          booked: s.booked,
          status: s.status,
        })),
      })),
    })
  })

  // GET /destinations/:slug/packages — pacotes ativos de um destino aprovado (público)
  app.get('/destinations/:slug/packages', async (request, reply) => {
    const { data: params, error: paramsError } = parseParams(slugParamsSchema, request.params, reply)
    if (paramsError) return

    const destination = await prisma.destination.findUnique({
      where: { slug: params.slug, active: true, approvalStatus: 'APPROVED' },
      select: { id: true },
    })

    if (!destination) throw new AppError('Destino não encontrado', 404)

    const packages = await prisma.tourPackage.findMany({
      where: {
        active: true,
        tenant: {
          destinationId: destination.id,
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        duration: true,
        price: true,
        difficulty: true,
        durationMinHours: true,
        durationMaxHours: true,
        tenant: {
          select: { slug: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return reply.status(200).send(
      packages.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        duration: p.duration,
        price: Number(p.price),
        difficulty: p.difficulty,
        durationMinHours: p.durationMinHours,
        durationMaxHours: p.durationMaxHours,
        tenantSlug: p.tenant.slug,
      }))
    )
  })
}
