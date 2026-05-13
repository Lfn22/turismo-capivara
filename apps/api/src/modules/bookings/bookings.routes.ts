import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { AppError } from '../../shared/errors/AppError'
import { createPixPayment } from '../../services/payment.service'

const createBookingBodySchema = z.object({
  slotId: z.string().min(1, { message: 'slotId obrigatório' }),
  customerName: z.string().min(1, { message: 'Nome do cliente obrigatório' }),
  customerEmail: z.string().email({ message: 'Email do cliente inválido' }),
  customerPhone: z.string().min(1, { message: 'Telefone do cliente obrigatório' }),
  customerCpf: z.string().min(11, { message: 'CPF do cliente obrigatório' }),
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
    const { slotId, customerName, customerEmail, customerPhone, customerCpf, pax } = body

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    })

    if (!tenant) {
      throw new AppError('Tenant não encontrado', 404)
    }

    const booking = await prisma.$transaction(async (tx) => {
      // Lock the slot row to prevent concurrent overbooking (WR-04)
      const [slot] = await tx.$queryRaw<Array<{
        id: string
        booked: number
        capacity: number
        status: string
        packageId: string
        tenantId: string
      }>>`
        SELECT ds.id, ds.booked, ds.capacity, ds.status, ds."packageId", tp."tenantId"
        FROM "DepartureSlot" ds
        JOIN "TourPackage" tp ON tp.id = ds."packageId"
        WHERE ds.id = ${slotId}
        FOR UPDATE
      `

      if (!slot) {
        throw new AppError('Slot não encontrado', 404)
      }

      if (slot.tenantId !== tenant.id) {
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
          customerCpf,
          pax,
          status: 'PENDING',
        },
      })
    })

    // Query package price OUTSIDE $transaction (keeps tx minimal)
    const pkg = await prisma.tourPackage.findFirst({
      where: { departureSlots: { some: { id: slotId } } },
      select: { price: true, name: true },
    })

    // Guard: package must exist to build a valid PIX amount
    if (!pkg) {
      await prisma.$transaction(async (tx) => {
        await tx.booking.delete({ where: { id: booking.id } })
        const s1 = await tx.departureSlot.findUnique({ where: { id: slotId }, select: { status: true } })
        await tx.departureSlot.update({
          where: { id: slotId },
          data: { booked: { decrement: pax }, ...(s1?.status === 'FULL' ? { status: 'OPEN' } : {}) },
        })
      })
      throw new AppError('Pacote não encontrado para este slot', 500)
    }

    // MP call happens OUTSIDE $transaction — per D-02
    let paymentResult
    try {
      paymentResult = await createPixPayment({
        bookingId: booking.id,
        transactionAmount: Number(pkg.price),
        description: `Reserva #${booking.id} — ${pkg.name}`,
        customerEmail,
        customerCpf,
      })
    } catch (err) {
      // Compensation: delete booking and restore slot atomically (per D-02)
      await prisma.$transaction(async (tx) => {
        await tx.booking.delete({ where: { id: booking.id } })
        const s2 = await tx.departureSlot.findUnique({ where: { id: slotId }, select: { status: true } })
        await tx.departureSlot.update({
          where: { id: slotId },
          data: {
            booked: { decrement: pax },
            ...(s2?.status === 'FULL' ? { status: 'OPEN' } : {}),
          },
        })
      })
      throw err // AppError 502 propagates to error handler
    }

    // Update booking with payment fields
    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentId: paymentResult.paymentId,
        paymentUrl: paymentResult.paymentUrl,
        expiresAt: paymentResult.expiresAt,
      },
    })

    return reply.status(201).send({
      id: updatedBooking.id,
      tenantId: updatedBooking.tenantId,
      slotId: updatedBooking.slotId,
      customerName: updatedBooking.customerName,
      customerEmail: updatedBooking.customerEmail,
      pax: updatedBooking.pax,
      status: updatedBooking.status,
      paymentId: updatedBooking.paymentId,
      paymentUrl: updatedBooking.paymentUrl,
      expiresAt: updatedBooking.expiresAt,
      createdAt: updatedBooking.createdAt,
      qrCode: paymentResult.qrCode,
    })
  })

  app.get(
    '/tenants/:slug/bookings/:id',
    async (request, reply) => {
      let params
      try {
        params = slugAndIdParamsSchema.parse(request.params)
      } catch (err) {
        if (err instanceof ZodError) return reply.status(400).send(zodError400(err))
        throw err
      }

      let query
      try {
        query = z.object({ email: z.string().email({ message: 'Email inválido' }) }).parse(request.query)
      } catch (err) {
        if (err instanceof ZodError) return reply.status(400).send(zodError400(err))
        throw err
      }

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
      if (!booking || booking.customerEmail !== email) {
        throw new AppError('Reserva não encontrada', 404)
      }

      const { customerCpf, customerPhone, ...safeBooking } = booking
      return safeBooking
    }
  )

  app.patch(
    '/tenants/:slug/bookings/:id/cancel',
    { preHandler: [authenticate, authorize(['ADMIN', 'ATENDENTE', 'CONDUTOR'])] },
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
        include: { slot: { include: { package: { select: { conductorId: true } } } } },
      })

      if (!booking) {
        throw new AppError('Reserva não encontrada', 404)
      }

      const user = request.user as { sub: string; role: string }
      if (user.role === 'CONDUTOR' && booking.slot?.package?.conductorId !== user.sub) {
        throw new AppError('Acesso negado', 403)
      }

      if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
        throw new AppError('Reserva não pode ser cancelada neste status', 400)
      }

      const updated = await prisma.$transaction(async (tx) => {
        const currentSlot = await tx.departureSlot.findUnique({ where: { id: booking.slotId } })
        const newBooked = Math.max(0, (currentSlot?.booked ?? booking.pax) - booking.pax)
        const remainingActive = await tx.booking.count({
          where: {
            slotId: booking.slotId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            id: { not: id },
          },
        })
        await tx.departureSlot.update({
          where: { id: booking.slotId },
          data: {
            booked: { decrement: booking.pax },
            // Only recalculate status for OPEN/FULL slots — preserve CANCELLED/COMPLETED
            ...(currentSlot?.status !== 'CANCELLED' && currentSlot?.status !== 'COMPLETED' ? {
              status: remainingActive === 0 && newBooked < (currentSlot?.capacity ?? 1) ? 'OPEN' : (newBooked >= (currentSlot?.capacity ?? 1) ? 'FULL' : 'OPEN'),
            } : {}),
          },
        })

        return tx.booking.update({
          where: { id },
          data: { status: 'CANCELLED' },
        })
      })

      const { customerCpf, customerPhone, ...safeBooking } = updated
      return safeBooking
    }
  )

  app.patch(
    '/tenants/:slug/bookings/:id/confirm',
    { preHandler: [authenticate, authorize(['ADMIN', 'ATENDENTE', 'CONDUTOR'])] },
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
        include: { slot: { include: { package: { select: { conductorId: true } } } } },
      })

      if (!booking) {
        throw new AppError('Reserva não encontrada', 404)
      }

      const user = request.user as { sub: string; role: string }
      if (user.role === 'CONDUTOR' && booking.slot?.package?.conductorId !== user.sub) {
        throw new AppError('Acesso negado', 403)
      }

      if (booking.status !== 'PENDING') {
        throw new AppError('Apenas reservas pendentes podem ser confirmadas', 400)
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: { status: 'CONFIRMED' },
      })

      const { customerCpf, customerPhone, ...safeBooking } = updated
      return safeBooking
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

      return bookings
    }
  )
}
