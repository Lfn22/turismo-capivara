import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { AppError } from '../../shared/errors/AppError'
import { createPixPayment } from '../../services/payment.service'
import { hashCpf } from '../../shared/utils/hash'
import { getResend } from '../../shared/email'
import { bookingCreatedEmailText, bookingCreatedSubject } from './emails/booking-created-email'
import { selfServiceBodySchema, type SelfServiceBody } from './bookings.schemas'
import { bookingCancelledEmailText } from './emails/booking-cancelled-email'
import { bookingGuideNotificationEmailText, bookingGuideNotificationSubject } from './emails/booking-guide-notification-email'
import * as paymentService from '../../services/payment.service'

const createBookingBodySchema = z.object({
  slotId: z.string().min(1, { message: 'slotId obrigatório' }),
  customerName: z.string().min(1, { message: 'Nome do cliente obrigatório' }),
  customerEmail: z.string().email({ message: 'Email do cliente inválido' }),
  customerPhone: z.string().min(1, { message: 'Telefone do cliente obrigatório' }),
  customerCpf: z.string().regex(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos numéricos' }),
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
  app.post('/tenants/:slug/bookings', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request, reply) => {
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

    const expiryMinutes = Number(process.env.BOOKING_EXPIRY_MINUTES ?? '30')

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    })

    if (!tenant) {
      throw new AppError('Tenant não encontrado', 404)
    }

    // HARDENING-01: Idempotency check — deve vir ANTES do $transaction
    const idempotencyKey = (request.headers['idempotency-key'] as string | undefined)?.trim() || undefined

    if (idempotencyKey) {
      const existing = await prisma.booking.findUnique({
        where: { tenantId_idempotencyKey: { tenantId: tenant.id, idempotencyKey } },
      })
      if (existing && existing.tenantId === tenant.id) {
        return reply.status(200).send({
          id: existing.id,
          tenantId: existing.tenantId,
          slotId: existing.slotId,
          customerName: existing.customerName,
          customerEmail: existing.customerEmail,
          pax: existing.pax,
          status: existing.status,
          paymentId: existing.paymentId,
          paymentUrl: existing.paymentUrl,
          expiresAt: existing.expiresAt,
          createdAt: existing.createdAt,
          qrCode: existing.qrCode,
        })
      }
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
          customerCpfHash: hashCpf(customerCpf),
          pax,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + expiryMinutes * 60_000),
          idempotencyKey: idempotencyKey ?? null,
        },
      })
    })

    // Query package price OUTSIDE $transaction (keeps tx minimal)
    const pkg = await prisma.tourPackage.findFirst({
      where: { departureSlots: { some: { id: slotId } } },
      select: {
        price: true,
        name: true,
        conductor: { select: { email: true } },
        departureSlots: { where: { id: slotId }, select: { startsAt: true }, take: 1 },
      },
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
        transactionAmount: Number(pkg.price) * pax,
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
        qrCode: paymentResult.qrCode,
      },
    })

    // NOTIF-01: Notify customer of pending booking with PIX details (fire-and-forget)
    const resend = getResend()
    if (resend) {
      resend.emails
        .send({
          from: 'CAPI <noreply@capi.turismo>',
          to: [customerEmail],
          subject: bookingCreatedSubject,
          text: bookingCreatedEmailText({
            bookingId: updatedBooking.id,
            customerName,
            qrCode: paymentResult.qrCode,
            paymentUrl: paymentResult.paymentUrl ?? '',
            expiresAt: updatedBooking.expiresAt ?? new Date(),
          }),
        })
        .catch((emailErr: unknown) => {
          app.log.warn({ err: emailErr }, '[email] Failed to send booking-created email')
        })
    }

    // NOTIF-05: Notify guide of new booking (fire-and-forget)
    const guideEmail = pkg.conductor?.email
    if (resend && guideEmail) {
      resend.emails
        .send({
          from: 'CAPI <noreply@capi.turismo>',
          to: [guideEmail],
          subject: bookingGuideNotificationSubject,
          text: bookingGuideNotificationEmailText({
            bookingId: updatedBooking.id,
            customerName,
            pax,
            packageName: pkg.name,
            slotDate: pkg.departureSlots[0]?.startsAt ?? new Date(),
          }),
        })
        .catch((emailErr: unknown) => {
          app.log.warn({ err: emailErr }, '[email] Failed to send guide notification email')
        })
    }

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

  // POST /tenants/:slug/bookings/lookup — public, no JWT
  app.post<{ Params: { slug: string }; Body: SelfServiceBody }>(
    '/tenants/:slug/bookings/lookup',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
          keyGenerator: (req) =>
            `lookup:email:${((req.body as { email?: string })?.email || '').trim().toLowerCase()}`,
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

  // POST /tenants/:slug/bookings/cancel-self — public, no JWT
  app.post<{ Params: { slug: string }; Body: SelfServiceBody }>(
    '/tenants/:slug/bookings/cancel-self',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
          keyGenerator: (req) =>
            `lookup:email:${((req.body as { email?: string })?.email || '').trim().toLowerCase()}`,
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

      const booking = await prisma.booking.findFirst({
        where: { id: { endsWith: code.toLowerCase() }, tenantId: tenant.id },
        orderBy: { createdAt: 'desc' },
        include: {
          slot: { select: { startsAt: true, package: { select: { name: true } } } },
        },
      })

      if (!booking || booking.customerEmail.toLowerCase() !== normalizedEmail) {
        throw new AppError('Reserva não encontrada ou dados inválidos', 404)
      }

      // 24h cutoff check (D-04)
      const cutoffMs = 24 * 60 * 60 * 1000
      if (booking.slot.startsAt.getTime() - Date.now() < cutoffMs) {
        throw new AppError('Cancelamento não permitido — menos de 24h até a partida', 422)
      }

      if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
        throw new AppError('Reserva não pode ser cancelada neste status', 422)
      }

      // Atomic cancel + slot release (D-04)
      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: 'CANCELLED' },
        })
        const currentSlot = await tx.departureSlot.findUnique({
          where: { id: booking.slotId },
          select: { booked: true, status: true },
        })
        const newBooked = Math.max(0, (currentSlot?.booked ?? booking.pax) - booking.pax)
        await tx.departureSlot.update({
          where: { id: booking.slotId },
          data: {
            booked: newBooked,
            ...(currentSlot?.status === 'FULL' ? { status: 'OPEN' } : {}),
          },
        })
      })

      // Fire-and-forget cancellation email (D-07)
      const resend = getResend()
      if (resend) {
        resend.emails
          .send({
            from: 'CAPI <noreply@capi.turismo>',
            to: [booking.customerEmail],
            subject: 'Cancelamento confirmado — CAPI',
            text: bookingCancelledEmailText({
              customerName: booking.customerName,
              packageName: booking.slot.package.name,
              startsAt: booking.slot.startsAt,
            }),
          })
          .catch((emailErr: unknown) => {
            app.log.warn({ err: emailErr }, '[email] Failed to send cancellation email')
          })
      }

      return reply.status(200).send({ message: 'Reserva cancelada com sucesso' })
    }
  )

  // POST /tenants/:slug/bookings/repay — public, no JWT — EXPIRED bookings only
  app.post<{ Params: { slug: string }; Body: SelfServiceBody }>(
    '/tenants/:slug/bookings/repay',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
          keyGenerator: (req) =>
            `lookup:email:${((req.body as { email?: string })?.email || '').trim().toLowerCase()}`,
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

      const booking = await prisma.booking.findFirst({
        where: { id: { endsWith: code.toLowerCase() }, tenantId: tenant.id },
        orderBy: { createdAt: 'desc' },
        include: {
          slot: {
            select: {
              startsAt: true,
              package: { select: { name: true, price: true } },
            },
          },
        },
      })

      if (!booking || booking.customerEmail.toLowerCase() !== normalizedEmail) {
        throw new AppError('Reserva não encontrada ou dados inválidos', 404)
      }

      if (booking.status !== 'EXPIRED') {
        throw new AppError('Novo pagamento só é possível para reservas expiradas', 422)
      }

      // Verify slot is still OPEN before creating a new payment
      const slot = await prisma.departureSlot.findUnique({
        where: { id: booking.slotId },
        select: { status: true },
      })
      if (!slot || slot.status !== 'OPEN') {
        throw new AppError('Slot indisponível para novo pagamento', 422)
      }

      // Create new MP payment
      // CPF not stored after hash — repay uses empty string (no CPF validation on repay)
      const transactionAmount = Number(booking.slot.package.price) * booking.pax
      const paymentResult = await paymentService.createPixPayment({
        bookingId: booking.id,
        transactionAmount,
        description: `Reserva #${booking.id} — ${booking.slot.package.name}`,
        customerEmail: booking.customerEmail,
        customerCpf: '',
      })

      // Lock slot and update booking atomically to prevent race condition
      await prisma.$transaction(async (tx) => {
        const [slotRow] = await tx.$queryRaw<Array<{ status: string }>>`
          SELECT status FROM "DepartureSlot"
          WHERE id = ${booking.slotId}
          FOR UPDATE
        `
        if (!slotRow || slotRow.status !== 'OPEN') {
          // MP payment was created but slot is gone — log for manual reconciliation
          throw new AppError('Slot indisponível para novo pagamento', 422)
        }
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            paymentId: paymentResult.paymentId,
            paymentUrl: paymentResult.paymentUrl,
            qrCode: paymentResult.qrCode,
            expiresAt: paymentResult.expiresAt,
            status: 'PENDING',
          },
        })
      })

      return reply.status(200).send({
        qrCode: paymentResult.qrCode,
        paymentUrl: paymentResult.paymentUrl,
        expiresAt: paymentResult.expiresAt,
      })
    }
  )

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
      if (!booking || booking.customerEmail.toLowerCase() !== email.toLowerCase()) {
        throw new AppError('Reserva não encontrada', 404)
      }

      const { customerCpfHash, customerPhone, ...safeBooking } = booking
      return safeBooking
    }
  )

  app.patch(
    '/tenants/:slug/bookings/:id/cancel',
    { preHandler: [authenticate, authorize(['ADMIN', 'ATENDENTE', 'CONDUTOR', 'SUPER_ADMIN'])] },
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
        await tx.departureSlot.update({
          where: { id: booking.slotId },
          data: {
            booked: { decrement: booking.pax },
            // Restore to OPEN if slot was FULL — preserve CANCELLED/COMPLETED
            ...(currentSlot?.status === 'FULL' ? { status: 'OPEN' } : {}),
          },
        })

        return tx.booking.update({
          where: { id },
          data: { status: 'CANCELLED' },
        })
      })

      const { customerCpfHash, customerPhone, ...safeBooking } = updated
      return safeBooking
    }
  )

  app.patch(
    '/tenants/:slug/bookings/:id/confirm',
    { preHandler: [authenticate, authorize(['ADMIN', 'ATENDENTE', 'CONDUTOR', 'SUPER_ADMIN'])] },
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

      const { customerCpfHash, customerPhone, ...safeBooking } = updated
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
