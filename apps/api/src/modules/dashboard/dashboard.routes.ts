import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

export async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    '/tenants/:slug/dashboard',
    { preHandler: [authenticate, authorize(['ADMIN', 'ATENDENTE', 'CONDUTOR', 'SUPER_ADMIN'])] },
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

      const [bookingCounts, confirmedBookings, upcomingSlots] = await Promise.all([
        prisma.booking.groupBy({
          by: ['status'],
          where: { tenantId: tenant.id },
          _count: { id: true },
        }),
        prisma.booking.findMany({
          where: { tenantId: tenant.id, status: { in: ['CONFIRMED', 'COMPLETED'] } },
          select: { pax: true, slot: { select: { package: { select: { price: true } } } } },
        }),
        prisma.departureSlot.findMany({
          where: {
            status: 'OPEN',
            startsAt: { gte: new Date() },
            package: { tenantId: tenant.id },
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
      ])

      const counts: Record<string, number> = {}
      for (const row of bookingCounts) {
        counts[row.status.toLowerCase()] = row._count.id
      }

      const confirmedRevenue = confirmedBookings.reduce((sum, b) => {
        return sum + Number(b.slot?.package?.price ?? 0) * b.pax
      }, 0)

      return reply.status(200).send({
        bookings: {
          pending: counts['pending'] ?? 0,
          confirmed: counts['confirmed'] ?? 0,
          cancelled: counts['cancelled'] ?? 0,
          completed: counts['completed'] ?? 0,
          expired: counts['expired'] ?? 0,
        },
        revenue: {
          confirmed: confirmedRevenue,
        },
        upcomingSlots,
      })
    }
  )
}
