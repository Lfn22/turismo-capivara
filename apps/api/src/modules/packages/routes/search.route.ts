import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Difficulty, Prisma } from '@prisma/client'
import prisma from '../../../database'
import { parseQuery } from '../../../shared/utils/zod-error'
import { paginationQuerySchema, paginatedResponse } from '../../../shared/utils/pagination'

const searchQuerySchema = paginationQuerySchema.extend({
  sw_lat: z.coerce.number().min(-90).max(90).optional(),
  sw_lng: z.coerce.number().min(-180).max(180).optional(),
  ne_lat: z.coerce.number().min(-90).max(90).optional(),
  ne_lng: z.coerce.number().min(-180).max(180).optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  difficulty: z.string().optional(),
  duration_min: z.coerce.number().int().min(0).optional(),
  duration_max: z.coerce.number().int().min(0).optional(),
  search: z.string().min(1).max(100).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'name']).optional().default('newest'),
})

function parseDifficulties(raw: string): Difficulty[] {
  const valid = new Set<string>(Object.values(Difficulty))
  return raw
    .split(',')
    .map((d) => d.trim().toUpperCase())
    .filter((d) => valid.has(d)) as Difficulty[]
}

export async function searchPackagesRoute(app: FastifyInstance) {
  app.get('/packages/search', async (request, reply) => {
    const { data: query, error } = parseQuery(searchQuerySchema, request.query, reply)
    if (error) return

    const {
      sw_lat,
      sw_lng,
      ne_lat,
      ne_lng,
      min_price,
      max_price,
      difficulty,
      duration_min,
      duration_max,
      search,
      sort,
      cursor,
      limit,
    } = query!

    const hasBbox =
      sw_lat !== undefined && sw_lng !== undefined && ne_lat !== undefined && ne_lng !== undefined

    // Parse difficulty filter
    const difficulties = difficulty ? parseDifficulties(difficulty) : undefined

    // Build base where clause
    const where: Prisma.TourPackageWhereInput = {
      active: true,
      publishedAt: { not: null },
      ...(difficulties && difficulties.length > 0 ? { difficulty: { in: difficulties } } : {}),
      ...(min_price !== undefined || max_price !== undefined
        ? {
            price: {
              ...(min_price !== undefined ? { gte: min_price } : {}),
              ...(max_price !== undefined ? { lte: max_price } : {}),
            },
          }
        : {}),
      ...(duration_min !== undefined || duration_max !== undefined
        ? {
            duration: {
              ...(duration_min !== undefined ? { gte: duration_min } : {}),
              ...(duration_max !== undefined ? { lte: duration_max } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      // Bounding box: filter packages that have a resolvable coordinate
      ...(hasBbox
        ? {
            OR: [
              // Prefer meetingPoint when it exists
              {
                meetingPointLat: { gte: sw_lat, lte: ne_lat },
                meetingPointLng: { gte: sw_lng, lte: ne_lng },
              },
              // Fall back to destination coords
              {
                meetingPointLat: null,
                destination: {
                  lat: { gte: sw_lat, lte: ne_lat },
                  lng: { gte: sw_lng, lte: ne_lng },
                },
              },
            ],
          }
        : {}),
    }

    // When both search and bbox are used, we need AND semantics.
    // The top-level `search` OR and `bbox` OR would conflict at the same level.
    // Restructure into AND array when both are present.
    let finalWhere: Prisma.TourPackageWhereInput
    if (search && hasBbox) {
      // Extract the individual OR clauses and combine with AND
      const { OR: _removed, ...baseWhere } = where
      finalWhere = {
        ...baseWhere,
        AND: [
          {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          },
          {
            OR: [
              {
                meetingPointLat: { gte: sw_lat!, lte: ne_lat! },
                meetingPointLng: { gte: sw_lng!, lte: ne_lng! },
              },
              {
                meetingPointLat: null,
                destination: {
                  lat: { gte: sw_lat!, lte: ne_lat! },
                  lng: { gte: sw_lng!, lte: ne_lng! },
                },
              },
            ],
          },
        ],
      }
    } else {
      finalWhere = where
    }

    const orderBy: Record<string, string> =
      sort === 'price_asc'
        ? { price: 'asc' }
        : sort === 'price_desc'
          ? { price: 'desc' }
          : sort === 'name'
            ? { name: 'asc' }
            : { createdAt: 'desc' }

    const packages = await prisma.tourPackage.findMany({
      where: finalWhere,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy,
      select: {
        id: true,
        name: true,
        price: true,
        difficulty: true,
        duration: true,
        photos: true,
        meetingPointLat: true,
        meetingPointLng: true,
        tenant: {
          select: { slug: true },
        },
        destination: {
          select: {
            title: true,
            slug: true,
            lat: true,
            lng: true,
          },
        },
      },
    })

    const data = packages.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      priceFrom: Number(pkg.price),
      difficulty: pkg.difficulty,
      durationMinutes: pkg.duration * 60,
      coverImageUrl: pkg.photos[0] ?? null,
      tags: [] as string[],
      tenantSlug: pkg.tenant.slug,
      destinationTitle: pkg.destination?.title ?? null,
      destinationSlug: pkg.destination?.slug ?? null,
      lat: pkg.meetingPointLat ?? pkg.destination?.lat ?? null,
      lng: pkg.meetingPointLng ?? pkg.destination?.lng ?? null,
    }))

    return reply.status(200).send(paginatedResponse(data, limit))
  })
}
