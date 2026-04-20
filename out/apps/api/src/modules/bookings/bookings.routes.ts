import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { AppError } from '../../shared/errors/AppError'

const createBookingBodySchema = z.object({
  slotId: z.string().min(1, { message: 'slotId obrigatório' }),
  customerName: z.string().min(1, { message: 'Nome do cliente obrigatório' }),
  customerEmail: z.string().email({ message: 'Email do cliente inválido' }),
  customerPhone: z.string().min(1, { message: 'Telefone do cliente obrigatório' }),
  pax: z.number().int().positive({ message: 'Número de participantes deve ser inteiro positivo' }),
})

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

const slugAndIdParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

function zodError400(err: ZodError) {
  return {
    message: 'Dados inválidos',
    errors: err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  }
}

export async function bookingsRoutes(app: FastifyInstance) {
  app.post('/tenants/:slug/bookings', async (request, reply) => {
    let params
    try {
      params = slugParamsSchema.parse(request.params)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError400(err))
      throw err
    }

    let body
    try {
      body = createBookingBodySchema.parse(request.body)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError400(err))
      throw err
    }

    const { slug } = params
    const { slotId, customerName, customerEmail, customerPhone, pax } = body

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    })

    if (!tenant) {
      throw new AppError('Tenant não encontrado', 404)
    }

    const booking = await prisma.$transaction(async (tx) => {
      const slot = await tx.departureSlot.findUnique({
        where: { id: slotId },
        include: { package: { select: { tenantId: true } } },
      })

      if (!slot) {
        throw new AppError('Slot não encontrado', 404)
      }

      if (slot.package.tenantId !== tenant.id) {
        throw new AppError('Slot não encontrado', 404)
      }

      if (slot.status !== 'OPEN') {
        throw new AppError('Slot indisponível', 400)
      }

      if (slot.booked + pax > slot.capacity) {
        throw new AppError('Capacidade insuficiente', 400)
      }

      await tx.departureSlot.update({
        where: { id: slotId },
        data: {
          booked: { increment: pax },
          status: slot.booked + pax >= slot.capacity ? 'FULL' : 'OPEN',
        },
      })

      return tx.booking.create({
        data: {
          tenantId: tenant.id,
          slotId,
          customerName,
          customerEmail,
          customerPhone,
          pax,
          status: 'PENDING',
        },
      })
    })

    return reply.status(201).send(booking)
  })

  app.patch(
    '/tenants/:slug/bookings/:id/cancel',
    { preHandler: [authenticate, authorize(['ADMIN', 'ATENDENTE'])] },
    async (request, reply) => {
      let params
      try {
        params = slugAndIdParamsSchema.parse(request.params)
      } catch (err) {
        if (err instanceof ZodError) return reply.status(400).send(zodError400(err))
        throw err
      }
      const { slug, id } = params

      const tenant = await prisma.tenant.findUnique({
        where: { slug },
      })

      if (!tenant) {
        throw new AppError('Tenant não encontrado', 404)
      }

      const booking = await prisma.booking.findFirst({
        where: { id, tenantId: tenant.id },
      })

      if (!booking) {
        throw new AppError('Reserva não encontrada', 404)
      }

      if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
        throw new AppError('Reserva não pode ser cancelada neste status', 400)
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.departureSlot.update({
          where: { id: booking.slotId },
          data: {
            booked: { decrement: booking.pax },
            status: 'OPEN',
          },
        })

        return tx.booking.update({
          where: { id },
          data: { status: 'CANCELLED' },
        })
      })

      return updated
    }
  )

  app.patch(
    '/tenants/:slug/bookings/:id/confirm',
    { preHandler: [authenticate, authorize(['ADMIN', 'ATENDENTE'])] },
    async (request, reply) => {
      let params
      try {
        params = slugAndIdParamsSchema.parse(request.params)
      } catch (err) {
        if (err instanceof ZodError) return reply.status(400).send(zodError400(err))
        throw err
      }
      const { slug, id } = params

      const tenant = await prisma.tenant.findUnique({
        where: { slug },
      })

      if (!tenant) {
        throw new AppError('Tenant não encontrado', 404)
      }

      const booking = await prisma.booking.findFirst({
        where: { id, tenantId: tenant.id },
      })

      if (!booking) {
        throw new AppError('Reserva não encontrada', 404)
      }

      if (booking.status !== 'PENDING') {
        throw new AppError('Apenas reservas pendentes podem ser confirmadas', 400)
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: { status: 'CONFIRMED' },
      })

      return updated
    }
  )

  app.get(
    '/tenants/:slug/bookings',
    {
      onRequest: [authenticate, authorize(['ADMIN', 'ATENDENTE'])],
    },
    async (request, reply) => {
      let params
      try {
        params = slugParamsSchema.parse(request.params)
      } catch (err) {
        if (err instanceof ZodError) return reply.status(400).send(zodError400(err))
        throw err
      }
      const { slug } = params

      const tenant = await prisma.tenant.findUnique({
        where: { slug },
      })

      if (!tenant) {
        throw new AppError('Tenant não encontrado', 404)
      }

      const bookings = await prisma.booking.findMany({
        where: { tenantId: tenant.id },
        include: {
          slot: {
            include: { package: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return bookings
    }
  )
}
