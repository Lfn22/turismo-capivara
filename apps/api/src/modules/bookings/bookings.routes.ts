import { FastifyInstance } from 'fastify'
import prisma from '../../database'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'

export async function bookingsRoutes(app: FastifyInstance) {
  app.post('/tenants/:slug/bookings', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    const { slotId, customerName, customerEmail, customerPhone, pax } =
      request.body as {
        slotId: string
        customerName: string
        customerEmail: string
        customerPhone: string
        pax: number
      }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    })

    if (!tenant) {
      return reply.status(404).send({ message: 'Tenant não encontrado' })
    }

    let booking
    try {
      booking = await prisma.$transaction(async (tx) => {
        const slot = await tx.departureSlot.findUnique({
          where: { id: slotId },
        })

        if (!slot) {
          throw new Error('SLOT_NOT_FOUND')
        }

        if (slot.status !== 'OPEN') {
          throw new Error('SLOT_UNAVAILABLE')
        }

        if (slot.booked + pax > slot.capacity) {
          throw new Error('INSUFFICIENT_CAPACITY')
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
    } catch (err) {
      const message = (err as Error).message

      if (message === 'SLOT_NOT_FOUND') {
        return reply.status(404).send({ message: 'Slot não encontrado' })
      }
      if (message === 'SLOT_UNAVAILABLE') {
        return reply.status(400).send({ message: 'Slot indisponível' })
      }
      if (message === 'INSUFFICIENT_CAPACITY') {
        return reply.status(400).send({ message: 'Capacidade insuficiente' })
      }

      return reply.status(500).send({ message: 'Erro interno' })
    }

    return reply.status(201).send(booking)
  })

  app.patch(
    '/tenants/:slug/bookings/:id/cancel',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { slug, id } = request.params as { slug: string; id: string }

      const tenant = await prisma.tenant.findUnique({
        where: { slug },
      })

      if (!tenant) {
        return reply.status(404).send({ message: 'Tenant não encontrado' })
      }

      const booking = await prisma.booking.findFirst({
        where: { id, tenantId: tenant.id },
      })

      if (!booking) {
        return reply.status(404).send({ message: 'Reserva não encontrada' })
      }

      if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
        return reply.status(400).send({
          message: 'Reserva não pode ser cancelada neste status',
        })
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
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { slug, id } = request.params as { slug: string; id: string }

      const tenant = await prisma.tenant.findUnique({
        where: { slug },
      })

      if (!tenant) {
        return reply.status(404).send({ message: 'Tenant não encontrado' })
      }

      const booking = await prisma.booking.findFirst({
        where: { id, tenantId: tenant.id },
      })

      if (!booking) {
        return reply.status(404).send({ message: 'Reserva não encontrada' })
      }

      if (booking.status !== 'PENDING') {
        return reply.status(400).send({
          message: 'Apenas reservas pendentes podem ser confirmadas',
        })
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
      const { slug } = request.params as { slug: string }

      const tenant = await prisma.tenant.findUnique({
        where: { slug },
      })

      if (!tenant) {
        return reply.status(404).send({ message: 'Tenant não encontrado' })
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
