import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import type { Prisma } from '@prisma/client'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { toCents, fromCents } from '../../shared/utils/money'
import { tourDateKey, tourDayRange } from '../packages/slot-rules'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

export async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    '/tenants/:slug/dashboard',
    { preHandler: [authenticate, authorize(['ADMIN', 'CONDUTOR', 'SUPER_ADMIN'])] },
    async (request, reply) => {
      let params
      try {
        params = slugParamsSchema.parse(request.params)
      } catch (err) {
        if (err instanceof ZodError) return reply.status(400).send({ message: 'Slug inválido' })
        throw err
      }

      const tenant = await prisma.tenant.findUnique({ where: { slug: params.slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)

      // CONDUTOR vê só as próprias datas (atribuídas a ele ou dos roteiros que conduz);
      // receita e reservas do tenant inteiro são da agência
      const user = request.user as { sub: string; role: string }
      let ownSlots: Prisma.DepartureSlotWhereInput[] | null = null
      if (user.role === 'CONDUTOR') {
        const profile = await prisma.guideProfile.findUnique({
          where: { userId: user.sub },
          select: { id: true },
        })
        ownSlots = [
          ...(profile ? [{ guideId: profile.id }] : []),
          { package: { conductorId: user.sub } },
        ]
      }
      const bookingScope = ownSlots ? { OR: ownSlots.map((slot) => ({ slot })) } : {}

      // "Hoje" no fuso dos passeios, não no do servidor
      const today = tourDayRange(tourDateKey(new Date()))

      const [bookingCounts, confirmedBookings, upcomingSlots, todayCount] = await Promise.all([
        prisma.booking.groupBy({
          by: ['status'],
          where: { tenantId: tenant.id, ...bookingScope },
          _count: { id: true },
        }),
        prisma.booking.findMany({
          where: {
            tenantId: tenant.id,
            status: { in: ['CONFIRMED', 'COMPLETED'] },
            ...bookingScope,
          },
          select: { pax: true, slot: { select: { package: { select: { price: true } } } } },
        }),
        prisma.departureSlot.findMany({
          where: {
            status: 'OPEN',
            startsAt: { gte: new Date() },
            package: { tenantId: tenant.id },
            ...(ownSlots ? { OR: ownSlots } : {}),
          },
          orderBy: { startsAt: 'asc' },
          take: 5,
          select: {
            id: true,
            startsAt: true,
            booked: true,
            capacity: true,
            package: { select: { name: true } },
          },
        }),
        prisma.booking.count({
          where: {
            tenantId: tenant.id,
            status: { in: ['PENDING', 'CONFIRMED'] },
            slot: { startsAt: { gte: today.start, lte: today.end } },
            ...bookingScope,
          },
        }),
      ])

      const counts: Record<string, number> = {}
      for (const row of bookingCounts) {
        counts[row.status.toLowerCase()] = row._count.id
      }

      const confirmedRevenueCents = confirmedBookings.reduce((sum, b) => {
        const price = b.slot?.package?.price
        return sum + (price ? toCents(price) : 0) * b.pax
      }, 0)
      const confirmedRevenue = fromCents(confirmedRevenueCents)

      return reply.status(200).send({
        bookings: {
          pending: counts['pending'] ?? 0,
          confirmed: counts['confirmed'] ?? 0,
          cancelled: counts['cancelled'] ?? 0,
          completed: counts['completed'] ?? 0,
          expired: counts['expired'] ?? 0,
          // Contagens do banco: a web antes contava só a 1ª página (20) de reservas
          today: todayCount,
          total: Object.values(counts).reduce((a, b) => a + b, 0),
        },
        revenue: {
          confirmed: confirmedRevenue,
        },
        upcomingSlots,
      })
    },
  )
}
