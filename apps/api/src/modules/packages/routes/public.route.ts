import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { parseParams, parseQuery } from '../../../shared/utils/zod-error'
import { paginationQuerySchema, paginatedResponse } from '../../../shared/utils/pagination'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

const slugAndIdParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

const packageIdParamsSchema = z.object({
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

export async function publicPackagesRoute(app: FastifyInstance) {
  app.get('/tenants/:slug/packages', async (request, reply) => {
    const { data: params, error } = parseParams(slugParamsSchema, request.params, reply)
    if (error) return

    const tenant = await prisma.tenant.findUnique({
      where: { slug: params!.slug },
    })

    if (!tenant) {
      throw new AppError('Tenant não encontrado', 404)
    }

    const packageQuerySchema = paginationQuerySchema.extend({
      conductorId: z.string().optional(),
      minPrice: z.coerce.number().min(0).optional(),
      maxPrice: z.coerce.number().min(0).optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      minAvailable: z.coerce.number().int().min(1).optional(),
      search: z.string().min(1).max(100).optional(),
      sortBy: z.enum(['price_asc', 'price_desc', 'newest', 'name']).optional().default('newest'),
    })

    const { data: pagination, error: pgErr } = parseQuery(packageQuerySchema, request.query, reply)
    if (pgErr) return
    const { conductorId, cursor, limit, minPrice, maxPrice, dateFrom, dateTo, minAvailable, search, sortBy } = pagination

    const orderBy: Record<string, string> =
      sortBy === 'price_asc' ? { price: 'asc' }
      : sortBy === 'price_desc' ? { price: 'desc' }
      : sortBy === 'name' ? { name: 'asc' }
      : { createdAt: 'desc' }

    const packages = await prisma.tourPackage.findMany({
      where: {
        tenantId: tenant.id,
        active: true,
        ...(conductorId ? { conductorId } : {}),
        ...(minPrice !== undefined || maxPrice !== undefined
          ? { price: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } }
          : {}),
        ...(dateFrom || dateTo
          ? {
              departureSlots: {
                some: {
                  status: 'OPEN',
                  ...(dateFrom ? { startsAt: { gte: new Date(dateFrom) } } : {}),
                  ...(dateTo ? { startsAt: { lte: new Date(dateTo) } } : {}),
                },
              },
            }
          : {}),
        ...(search
          ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }] }
          : {}),
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy,
      select: {
        id: true,
        name: true,
        description: true,
        duration: true,
        durationMaxHours: true,
        bufferMinutes: true,
        price: true,
        difficulty: true,
        active: true,
        conductorId: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        photos: true,
        highlights: true,
        departureSlots: {
          where: {
            startsAt: { gte: new Date() },
            status: 'OPEN',
          },
          orderBy: { startsAt: 'asc' },
          take: 5,
        },
      },
    })

    const packagesWithMinReached = packages
      .filter((pkg) =>
        minAvailable === undefined
          ? true
          : pkg.departureSlots.some((s) => s.capacity - s.booked >= minAvailable),
      )
      .map((pkg) => ({
        ...pkg,
        departureSlots: pkg.departureSlots.map((slot) => ({
          ...slot,
          hasMinimumReached: slot.booked >= slot.minCapacity,
        })),
      }))
    return reply.status(200).send(paginatedResponse(packagesWithMinReached, limit))
  })

  app.get('/tenants/:slug/packages/:id', async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    const tenant = await prisma.tenant.findUnique({
      where: { slug: params!.slug },
    })

    if (!tenant) {
      throw new AppError('Tenant não encontrado', 404)
    }

    const tourPackage = await prisma.tourPackage.findFirst({
      where: {
        id: params!.id,
        tenantId: tenant.id,
      },
      include: {
        departureSlots: {
          where: {
            startsAt: { gte: new Date() },
            status: 'OPEN',
          },
          orderBy: { startsAt: 'asc' },
        },
      },
    })

    if (!tourPackage) {
      throw new AppError('Roteiro não encontrado', 404)
    }

    const packageWithMinReached = {
      ...tourPackage,
      departureSlots: tourPackage.departureSlots.map((slot) => ({
        ...slot,
        hasMinimumReached: slot.booked >= slot.minCapacity,
      })),
    }
    return packageWithMinReached
  })

  // GET /packages/:id/guides — guias qualificados de um pacote (público)
  app.get('/packages/:id/guides', async (request, reply) => {
    const { data: params, error } = parseParams(packageIdParamsSchema, request.params, reply)
    if (error) return

    const guides = await prisma.packageGuide.findMany({
      where: {
        packageId: params!.id,
        active: true,
      },
      include: {
        guide: {
          select: {
            id: true,
            bio: true,
            photoUrl: true,
            especialidades: true,
            regioes: true,
            user: {
              select: { name: true },
            },
          },
        },
      },
    })

    return reply.status(200).send(
      guides.map((pg) => ({
        guideId: pg.guide.id,
        name: pg.guide.user.name,
        bio: pg.guide.bio,
        photoUrl: pg.guide.photoUrl,
        especialidades: pg.guide.especialidades,
        regioes: pg.guide.regioes,
      }))
    )
  })
}
