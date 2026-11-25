import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { parseParams, parseQuery } from '../../../shared/utils/zod-error'
import { paginationQuerySchema, paginatedResponse } from '../../../shared/utils/pagination'
import prisma from '../../../database'
import { authenticate } from '../../../shared/middlewares/authenticate'
import { authorize } from '../../../shared/middlewares/authorize'
import { AppError } from '../../../shared/errors/AppError'
import { Sentry } from '../../../shared/sentry'
import { notifyBookingEvent } from '../../notifications/booking-events'
import { isPlatformStaff } from '../../../shared/auth/roles'
import { cancelBooking } from '../cancel-booking'
import { clientIp } from '../../../shared/utils/client-ip'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

const slugAndIdParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

export async function adminBookingsRoute(app: FastifyInstance) {
  // Público (sem JWT): usado pelo checkout, polling de status e confirmação do turista convidado.
  // Autorização = id (cuid, não enumerável) + e-mail do cliente; 404 opaco para ambos (D-08).
  app.get(
    '/tenants/:slug/bookings/:id',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '15 minutes',
          keyGenerator: (req) => `booking-get:ip:${clientIp(req)}`,
        },
      },
    },
    async (request, reply) => {
      const { data: params, error: paramsError } = parseParams(
        slugAndIdParamsSchema,
        request.params,
        reply,
      )
      if (paramsError) return

      const { data: query, error: queryError } = parseQuery(
        z.object({ email: z.string().email({ message: 'Email inválido' }) }),
        request.query,
        reply,
      )
      if (queryError) return

      const { slug, id } = params
      const { email } = query

      const tenant = await prisma.tenant.findUnique({ where: { slug } })
      if (!tenant) {
        throw new AppError('Tenant não encontrado', 404)
      }

      const booking = await prisma.booking.findFirst({
        where: { id, tenantId: tenant.id },
        include: {
          slot: {
            select: {
              startsAt: true,
              package: { select: { name: true } },
            },
          },
        },
      })

      // Return 404 for both "not found" and "email mismatch" to prevent enumeration (D-08)
      if (!booking || booking.customerEmail.toLowerCase() !== email.toLowerCase()) {
        throw new AppError('Reserva não encontrada', 404)
      }

      // Rota pública: nunca devolver token de cancelamento nem dados sensíveis
      const { customerCpfHash, customerPhone, cancelToken, idempotencyKey, ...safeBooking } =
        booking
      return safeBooking
    },
  )

  app.patch(
    '/tenants/:slug/bookings/:id/cancel',
    {
      preHandler: [authenticate, authorize(['ADMIN', 'PLATFORM_ADMIN', 'CONDUTOR', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const { data: params, error: paramsError } = parseParams(
        slugAndIdParamsSchema,
        request.params,
        reply,
      )
      if (paramsError) return
      const { slug, id } = params

      Sentry.setTag('module', 'bookings')
      Sentry.setTag('tenant', slug)
      Sentry.setTag('action', 'admin-cancel')

      const tenant = await prisma.tenant.findUnique({
        where: { slug },
      })

      if (!tenant) {
        throw new AppError('Tenant não encontrado', 404)
      }

      const booking = await prisma.booking.findFirst({
        where: { id, tenantId: tenant.id },
        include: { slot: { include: { package: { select: { conductorId: true } } } } },
      })

      if (!booking) {
        throw new AppError('Reserva não encontrada', 404)
      }

      const user = request.user as { sub: string; role: string; tenantId: string }
      if (!isPlatformStaff(user.role) && booking.tenantId !== user.tenantId) {
        throw new AppError('Acesso negado', 403)
      }
      if (user.role === 'CONDUTOR' && booking.slot?.package?.conductorId !== user.sub) {
        throw new AppError('Acesso negado', 403)
      }

      if (booking.status === 'CANCELLED') {
        throw new AppError('Reserva já cancelada', 400)
      }

      if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
        throw new AppError('Reserva não pode ser cancelada neste status', 400)
      }

      // Estorno (CONFIRMED) / cancelamento do PIX (PENDING) + cancelamento atômico
      await cancelBooking(booking, request.log)

      void notifyBookingEvent(app.log, booking.id, 'cancelled').catch(() => {})

      // Allowlist explícita — nunca CPF, telefone ou tokens
      return {
        id: booking.id,
        code: booking.code,
        tenantId: booking.tenantId,
        slotId: booking.slotId,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        pax: booking.pax,
        status: 'CANCELLED',
      }
    },
  )

  app.patch(
    '/tenants/:slug/bookings/:id/confirm',
    {
      preHandler: [authenticate, authorize(['ADMIN', 'PLATFORM_ADMIN', 'CONDUTOR', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const { data: params, error: paramsError } = parseParams(
        slugAndIdParamsSchema,
        request.params,
        reply,
      )
      if (paramsError) return
      const { slug, id } = params

      Sentry.setTag('module', 'bookings')
      Sentry.setTag('tenant', slug)
      Sentry.setTag('action', 'confirm')

      const tenant = await prisma.tenant.findUnique({
        where: { slug },
      })

      if (!tenant) {
        throw new AppError('Tenant não encontrado', 404)
      }

      const booking = await prisma.booking.findFirst({
        where: { id, tenantId: tenant.id },
        include: { slot: { include: { package: { select: { conductorId: true } } } } },
      })

      if (!booking) {
        throw new AppError('Reserva não encontrada', 404)
      }

      const user = request.user as { sub: string; role: string; tenantId: string }
      if (!isPlatformStaff(user.role) && booking.tenantId !== user.tenantId) {
        throw new AppError('Acesso negado', 403)
      }
      if (user.role === 'CONDUTOR' && booking.slot?.package?.conductorId !== user.sub) {
        throw new AppError('Acesso negado', 403)
      }

      if (booking.status !== 'PENDING') {
        throw new AppError('Apenas reservas pendentes podem ser confirmadas', 400)
      }

      const confirmed = await prisma.booking.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'CONFIRMED' },
      })
      if (confirmed.count === 0) {
        throw new AppError('Apenas reservas pendentes podem ser confirmadas', 400)
      }

      const updated = await prisma.booking.findUniqueOrThrow({ where: { id } })

      void notifyBookingEvent(app.log, updated.id, 'confirmed').catch(() => {})

      const { customerCpfHash, customerPhone, ...safeBooking } = updated
      return safeBooking
    },
  )

  app.get(
    '/tenants/:slug/bookings',
    {
      preHandler: [authenticate, authorize(['ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const { data: params, error: paramsError } = parseParams(
        slugParamsSchema,
        request.params,
        reply,
      )
      if (paramsError) return
      const { slug } = params

      const tenant = await prisma.tenant.findUnique({
        where: { slug },
      })

      if (!tenant) {
        throw new AppError('Tenant não encontrado', 404)
      }

      const { data: pagination, error: pgErr } = parseQuery(
        paginationQuerySchema,
        request.query,
        reply,
      )
      if (pgErr) return

      const bookings = await prisma.booking.findMany({
        where: { tenantId: tenant.id },
        take: pagination.limit + 1,
        ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          customerName: true,
          customerEmail: true,
          pax: true,
          status: true,
          paymentId: true,
          paymentUrl: true,
          expiresAt: true,
          createdAt: true,
          slot: { include: { package: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      return reply.status(200).send(paginatedResponse(bookings, pagination.limit))
    },
  )
}
