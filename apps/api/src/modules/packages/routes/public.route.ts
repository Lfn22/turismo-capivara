import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { BOOKING_CUTOFF_HOURS } from '../../bookings/booking-cutoff'
import { parseParams, parseQuery } from '../../../shared/utils/zod-error'
import { paginationQuerySchema, paginatedResponse } from '../../../shared/utils/pagination'
import { destinationNotArchived } from '../package-visibility'
import { GROUP_SIZE_PER_GUIDE } from '../../../shared/utils/money'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

const slugAndIdParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

type SlotForGroup = { booked: number; status: string; minCapacity: number; maxGuides: number }

// Campos do modelo de grupo: sem extraGuidePrice o roteiro aceita só 1 guia
export function groupSlotFields(slot: SlotForGroup, extraGuidePrice: number | null) {
  return {
    hasMinimumReached: slot.booked >= slot.minCapacity,
    available: slot.booked === 0 && slot.status === 'OPEN',
    maxPax: (extraGuidePrice !== null ? slot.maxGuides : 1) * GROUP_SIZE_PER_GUIDE,
  }
}

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
    const {
      conductorId,
      cursor,
      limit,
      minPrice,
      maxPrice,
      dateFrom,
      dateTo,
      minAvailable,
      search,
      sortBy,
    } = pagination

    const orderBy: Record<string, string> =
      sortBy === 'price_asc'
        ? { price: 'asc' }
        : sortBy === 'price_desc'
          ? { price: 'desc' }
          : sortBy === 'name'
            ? { name: 'asc' }
            : { createdAt: 'desc' }

    // Datas reserváveis começam no corte de 24h (createBooking recusa antes disso)
    const bookableFrom = new Date(Date.now() + BOOKING_CUTOFF_HOURS * 3600_000)
    const startsAtWindow = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    }

    // minAvailable: horário livre (booked = 0, a reserva ocupa o horário todo) cujo máximo de
    // pessoas (guias × 8, mesma regra do maxPax) comporta o pedido; compara colunas de duas
    // tabelas, o que o where do Prisma não expressa: resolve os roteiros elegíveis no SQL ANTES de paginar (filtrar a página
    // em memória deixava páginas vazias e cursor/hasMore errados)
    let availableIds: string[] | undefined
    if (minAvailable !== undefined) {
      const from = dateFrom && new Date(dateFrom) > bookableFrom ? new Date(dateFrom) : bookableFrom
      const rows = dateTo
        ? await prisma.$queryRaw<Array<{ packageId: string }>>`
            SELECT DISTINCT ds."packageId" FROM "DepartureSlot" ds
            JOIN "TourPackage" tp ON tp.id = ds."packageId"
            WHERE ds.status = 'OPEN'
              AND ds."startsAt" >= ${from}
              AND ds."startsAt" <= ${new Date(dateTo)}
              AND ds.booked = 0
              AND (CASE WHEN tp."extraGuidePrice" IS NULL THEN 1 ELSE ds."maxGuides" END) * ${GROUP_SIZE_PER_GUIDE} >= ${minAvailable}
          `
        : await prisma.$queryRaw<Array<{ packageId: string }>>`
            SELECT DISTINCT ds."packageId" FROM "DepartureSlot" ds
            JOIN "TourPackage" tp ON tp.id = ds."packageId"
            WHERE ds.status = 'OPEN'
              AND ds."startsAt" >= ${from}
              AND ds.booked = 0
              AND (CASE WHEN tp."extraGuidePrice" IS NULL THEN 1 ELSE ds."maxGuides" END) * ${GROUP_SIZE_PER_GUIDE} >= ${minAvailable}
          `
      availableIds = rows.map((r) => r.packageId)
    }

    const packages = await prisma.tourPackage.findMany({
      where: {
        tenantId: tenant.id,
        active: true,
        publishedAt: { not: null },
        AND: [destinationNotArchived],
        ...(conductorId ? { conductorId } : {}),
        ...(availableIds ? { id: { in: availableIds } } : {}),
        ...(minPrice !== undefined || maxPrice !== undefined
          ? {
              price: {
                ...(minPrice !== undefined ? { gte: minPrice } : {}),
                ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
              },
            }
          : {}),
        ...(dateFrom || dateTo
          ? { departureSlots: { some: { status: 'OPEN', startsAt: startsAtWindow } } }
          : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
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
        extraGuidePrice: true,
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
            startsAt: { gte: bookableFrom },
            status: 'OPEN',
          },
          orderBy: { startsAt: 'asc' },
          take: 5,
        },
      },
    })

    const packagesWithMinReached = packages.map((pkg) => {
      const extraGuidePrice = pkg.extraGuidePrice === null ? null : Number(pkg.extraGuidePrice)
      return {
        ...pkg,
        price: Number(pkg.price),
        extraGuidePrice,
        departureSlots: pkg.departureSlots.map((slot) => ({
          ...slot,
          ...groupSlotFields(slot, extraGuidePrice),
        })),
      }
    })
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
        active: true,
        publishedAt: { not: null },
        AND: [destinationNotArchived],
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

    const extraGuidePrice =
      tourPackage.extraGuidePrice === null ? null : Number(tourPackage.extraGuidePrice)
    const packageWithMinReached = {
      ...tourPackage,
      price: Number(tourPackage.price),
      extraGuidePrice,
      departureSlots: tourPackage.departureSlots.map((slot) => ({
        ...slot,
        ...groupSlotFields(slot, extraGuidePrice),
      })),
    }
    return packageWithMinReached
  })

  // GET /packages/:id/guides — guias qualificados de um pacote (público)
  app.get('/packages/:id/guides', async (request, reply) => {
    const { data: params, error } = parseParams(packageIdParamsSchema, request.params, reply)
    if (error) return

    const published = await prisma.tourPackage.findFirst({
      where: {
        id: params!.id,
        active: true,
        publishedAt: { not: null },
        AND: [destinationNotArchived],
      },
      select: { id: true },
    })
    if (!published) throw new AppError('Roteiro não encontrado', 404)

    const guides = await prisma.packageGuide.findMany({
      where: {
        packageId: params!.id,
        status: 'ACCEPTED',
        guide: { user: { approvalStatus: 'APPROVED' } },
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
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    return reply.status(200).send(
      guides.map((pg) => ({
        guideId: pg.guide.id,
        // TourPackage.conductorId é um User.id — permite achar o condutor nesta lista
        userId: pg.guide.user.id,
        name: pg.guide.user.name,
        bio: pg.guide.bio,
        photoUrl: pg.guide.photoUrl,
        especialidades: pg.guide.especialidades,
        regioes: pg.guide.regioes,
      })),
    )
  })
}
