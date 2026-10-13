import { FastifyInstance } from 'fastify'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { selfServiceBodySchema, type SelfServiceBody } from '../bookings.schemas'

export async function selfServiceRoute(app: FastifyInstance) {
  // POST /tenants/:slug/bookings/lookup — public, no JWT
  app.post<{ Params: { slug: string }; Body: SelfServiceBody }>(
    '/tenants/:slug/bookings/lookup',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
          keyGenerator: (req) => `lookup:ip:${req.ip}`,
        },
      },
    },
    async (request, reply) => {
      const parsed = selfServiceBodySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' })
      }
      const { slug } = request.params
      const { email, code } = parsed.data

      const tenant = await prisma.tenant.findUnique({ where: { slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)

      const normalizedEmail = email.trim().toLowerCase()

      // TODO WR-002: endsWith gera LIKE '%suffix' sem índice — migrar para campo `code String @unique`
      // separado com índice dedicado para evitar full-table scan em produção com volume alto.
      const booking = await prisma.booking.findFirst({
        where: {
          id: { endsWith: code.toLowerCase() },
          tenantId: tenant.id,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          slot: {
            select: {
              startsAt: true,
              package: { select: { name: true, description: true } },
            },
          },
        },
      })

      // Opaque error — never reveal which field failed (D-13)
      if (!booking || booking.customerEmail.toLowerCase() !== normalizedEmail) {
        throw new AppError('Reserva não encontrada ou dados inválidos', 404)
      }

      return reply.status(200).send({
        id: booking.id,
        status: booking.status,
        customerName: booking.customerName,
        pax: booking.pax,
        qrCode: booking.qrCode ?? null,
        paymentUrl: booking.paymentUrl ?? null,
        expiresAt: booking.expiresAt ?? null,
        tenantWhatsapp: tenant.whatsapp ?? null,
        slot: {
          startsAt: booking.slot.startsAt,
          packageName: booking.slot.package.name,
        },
      })
    }
  )
}
