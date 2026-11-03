import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { Role } from '@prisma/client'
import { parseParams, parseQuery } from '../../shared/utils/zod-error'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

const financialQuerySchema = z.object({
  from: z.string().date('Data inicial inválida'),
  to: z.string().date('Data final inválida'),
})

export async function reportsRoutes(app: FastifyInstance) {
  app.get('/tenants/:slug/reports/financial', {
    preHandler: [authenticate, authorize([Role.ADMIN])],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugParamsSchema, request.params, reply)
    if (error) return

    const { data: query, error: queryError } = parseQuery(financialQuerySchema, request.query, reply)
    if (queryError) return

    const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    const user = request.user as { sub: string; tenantId: string }
    if (user.tenantId !== tenant.id) {
      throw new AppError('Acesso negado', 403)
    }

    const from = new Date(query!.from)
    from.setHours(0, 0, 0, 0)
    const to = new Date(query!.to)
    to.setHours(23, 59, 59, 999)

    const bookings = await prisma.booking.findMany({
      where: {
        tenantId: tenant.id,
        createdAt: { gte: from, lte: to },
      },
      include: {
        slot: {
          include: {
            package: { select: { id: true, name: true, price: true } },
            guide: { select: { id: true, user: { select: { name: true } } } },
          },
        },
      },
    })

    const confirmed = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
    const cancelled = bookings.filter((b) => b.status === 'CANCELLED')
    const expired = bookings.filter((b) => b.status === 'EXPIRED')

    const totalRevenue = confirmed.reduce((sum, b) => {
      const price = Number(b.slot.package.price)
      return sum + price * b.pax
    }, 0)

    const averageTicket = confirmed.length > 0 ? Math.round((totalRevenue / confirmed.length) * 100) / 100 : 0

    // By package
    const byPackageMap = new Map<string, { packageId: string; packageName: string; bookings: number; revenue: number }>()
    for (const b of confirmed) {
      const pkg = b.slot.package
      const entry = byPackageMap.get(pkg.id) ?? { packageId: pkg.id, packageName: pkg.name, bookings: 0, revenue: 0 }
      entry.bookings += 1
      entry.revenue += Number(pkg.price) * b.pax
      byPackageMap.set(pkg.id, entry)
    }

    // By guide
    const byGuideMap = new Map<string, { guideId: string; guideName: string; bookings: number; revenue: number }>()
    for (const b of confirmed) {
      const guide = b.slot.guide
      if (!guide) continue
      const entry = byGuideMap.get(guide.id) ?? { guideId: guide.id, guideName: guide.user.name, bookings: 0, revenue: 0 }
      entry.bookings += 1
      entry.revenue += Number(b.slot.package.price) * b.pax
      byGuideMap.set(guide.id, entry)
    }

    return {
      period: { from: query!.from, to: query!.to },
      totalRevenue,
      totalBookings: bookings.length,
      confirmedBookings: confirmed.length,
      cancelledBookings: cancelled.length,
      expiredBookings: expired.length,
      averageTicket,
      byPackage: [...byPackageMap.values()],
      byGuide: [...byGuideMap.values()],
    }
  })
}
