import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import prisma from '../../database'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { AppError } from '../../shared/errors/AppError'
import { createPixPayment } from '../../services/payment.service'
import { hashCpf } from '../../shared/utils/hash'
import { getResend, getEmailFrom } from '../../shared/email'
import { bookingCreatedEmailText, bookingCreatedSubject } from './emails/booking-created-email'
import { selfServiceBodySchema, type SelfServiceBody, cancelSelfBodySchema, type CancelSelfBody, repayBodySchema, type RepayBody } from './bookings.schemas'
import { randomBytes } from 'crypto'
import { bookingCancelledEmailText } from './emails/booking-cancelled-email'
import { bookingGuideNotificationEmailText, bookingGuideNotificationSubject } from './emails/booking-guide-notification-email'
import * as paymentService from '../../services/payment.service'
import { notifyBookingEvent } from '../notifications/booking-events'

function isValidCPF(cpf: string): boolean {
  // Rejeitar sequências de dígitos iguais (00000000000, 11111111111, etc.)
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const digits = cpf.split('').map(Number)

  // Dígito verificador 1: soma dos 9 primeiros × pesos 10..2
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i)
  }
  let remainder = sum % 11
  const digit1 = remainder < 2 ? 0 : 11 - remainder

  if (digits[9] !== digit1) return false

  // Dígito verificador 2: soma dos 10 primeiros × pesos 11..2
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * (11 - i)
  }
  remainder = sum % 11
  const digit2 = remainder < 2 ? 0 : 11 - remainder

  return digits[10] === digit2
}

const createBookingBodySchema = z.object({
  slotId: z.string().min(1, { message: 'slotId obrigatório' }),
  customerName: z.string().min(1, { message: 'Nome do cliente obrigatório' }),
  customerEmail: z.string().email({ message: 'Email do cliente inválido' }),
  customerPhone: z.string().min(1, { message: 'Telefone do cliente obrigatório' }),
  customerCpf: z.string()
    .regex(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos numéricos' })
    .refine(isValidCPF, { message: 'CPF inválido' }),
  pax: z.number().int().positive({ message: 'Número de participantes deve ser inteiro positivo' }).max(100, { message: 'Número de participantes não pode exceder 100' }),
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

/** Public shape of a booking on create — omits customerPhone and customerCpfHash. */
function bookingResponse(b: {
  id: string
  tenantId: string
  slotId: string
  customerName: string
  customerEmail: string
  pax: number
  status: string
  paymentId: string | null
  paymentUrl: string | null
  expiresAt: Date | null
  createdAt: Date
  qrCode: string | null
}) {
  return {
    id: b.id,
    tenantId: b.tenantId,
    slotId: b.slotId,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    pax: b.pax,
    status: b.status,
    paymentId: b.paymentId,
    paymentUrl: b.paymentUrl,
    expiresAt: b.expiresAt,
    createdAt: b.createdAt,
    qrCode: b.qrCode,
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

    // JWT opcional: só turista (CLIENTE) logado vincula a reserva; token ruim segue como guest
    let userId: string | null = null
    try {
      await request.jwtVerify()
      const user = request.user as { sub: string; role: string }
      if (user.role === 'CLIENTE') userId = user.sub
    } catch {
      userId = null
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    })

    if (!tenant) {
      throw new AppError('Tenant não encontrado', 404)
    }

    // DATA-02: Tenant approval gate — generic message per D-12 (do not expose real reason)
    if (tenant.approvalStatus !== 'APPROVED') {
      throw new AppError('Reservas indisponíveis no momento.', 403)
    }

    const idempotencyKey = (request.headers['idempotency-key'] as string | undefined)?.trim() || undefined

    // Fast path: a retry that already succeeded returns the same booking without work.
    // This is only an optimisation — the real guarantee is the unique constraint claimed
    // inside the transaction below (C-3), which is what makes concurrent retries safe.
    if (idempotencyKey) {
      const existing = await prisma.booking.findUnique({
        where: { tenantId_idempotencyKey: { tenantId: tenant.id, idempotencyKey } },
      })
      if (existing && existing.tenantId === tenant.id) {
        return reply.status(200).send(bookingResponse(existing))
      }
    }

    // C-2: expiry is decided from OUR clock, before any external call, so the booking row
    // can be written durably up front. BOOKING_EXPIRY_MINUTES is now actually honoured.
    const expiryMinutes = Number(process.env.BOOKING_EXPIRY_MINUTES ?? '30')
    const expiresAt = new Date(Date.now() + expiryMinutes * 60_000)
    const bookingId = randomBytes(16).toString('hex')
    const cancelToken = randomBytes(32).toString('hex')

    // Single transaction: lock the slot, validate, increment seats AND persist the booking.
    //
    // C-2: previously the seat increment committed on its own and the Booking row was only
    // created after the Mercado Pago round-trip. A crash in that window left seats held by a
    // booking that never existed — unreclaimable, because the expiry job scans Booking rows.
    // Now seats are never held without a row that the expiry job can find and reverse.
    //
    // C-3: the idempotency key is claimed by the unique constraint inside this same
    // transaction, so a losing concurrent request rolls back the seat increment too,
    // instead of leaking capacity and creating a second PIX charge.
    let booking
    try {
      booking = await prisma.$transaction(async (tx) => {
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
            id: bookingId,
            tenantId: tenant.id,
            slotId,
            customerName,
            customerEmail,
            customerPhone,
            customerCpfHash: hashCpf(customerCpf),
            pax,
            status: 'PENDING',
            expiresAt,
            idempotencyKey: idempotencyKey ?? null,
            cancelToken,
            userId,
          },
        })
      })
    } catch (err) {
      // C-3: another request with the same Idempotency-Key won the race. Its transaction
      // committed; ours rolled back entirely (seats included). Return its booking.
      if (
        idempotencyKey &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const winner = await prisma.booking.findUnique({
          where: { tenantId_idempotencyKey: { tenantId: tenant.id, idempotencyKey } },
        })
        if (winner) return reply.status(200).send(bookingResponse(winner))
      }
      throw err
    }

    // From here on the booking exists and holds its seats. Every failure path below is
    // recoverable: worst case the row stays PENDING and the expiry job releases the seats.
    const releaseBooking = async () => {
      await prisma.$transaction(async (tx) => {
        const released = await tx.booking.updateMany({
          where: { id: bookingId, status: 'PENDING' },
          data: { status: 'EXPIRED' },
        })
        if (released.count === 0) return
        const slot = await tx.departureSlot.findUnique({ where: { id: slotId }, select: { status: true } })
        await tx.departureSlot.updateMany({
          where: { id: slotId, booked: { gte: pax } },
          data: {
            booked: { decrement: pax },
            ...(slot?.status === 'FULL' ? { status: 'OPEN' } : {}),
          },
        })
      })
    }

    const pkg = await prisma.tourPackage.findFirst({
      where: { departureSlots: { some: { id: slotId } } },
      select: {
        price: true,
        name: true,
        conductor: { select: { email: true } },
        departureSlots: { where: { id: slotId }, select: { startsAt: true }, take: 1 },
      },
    })

    if (!pkg) {
      await releaseBooking()
      throw new AppError('Pacote não encontrado para este slot', 500)
    }

    // MP call stays OUTSIDE the transaction (per D-02) — a network round-trip must never
    // hold a row lock. external_reference matches the booking id already persisted.
    let paymentResult
    try {
      paymentResult = await createPixPayment({
        bookingId,
        transactionAmount: Number(pkg.price) * pax,
        description: `Reserva — ${pkg.name}`,
        customerEmail,
        customerCpf,
        expiresAt,
      })
    } catch (err) {
      await releaseBooking()
      throw err // AppError 502 propagates to error handler
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
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
          from: getEmailFrom(),
          to: [customerEmail],
          subject: bookingCreatedSubject,
          text: bookingCreatedEmailText({
            bookingId: updatedBooking.id,
            customerName,
            qrCode: paymentResult.qrCode,
            paymentUrl: paymentResult.paymentUrl ?? '',
            expiresAt: updatedBooking.expiresAt ?? new Date(),
            cancelToken: updatedBooking.cancelToken,
            tenantSlug: slug,
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
          from: getEmailFrom(),
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

    void notifyBookingEvent(app.log, updatedBooking.id, 'created').catch(() => {})

    return reply.status(201).send(bookingResponse(updatedBooking))
  })

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

  // POST /tenants/:slug/bookings/cancel-self — public, no JWT
  app.post<{ Params: { slug: string }; Body: CancelSelfBody }>(
    '/tenants/:slug/bookings/cancel-self',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '15 minutes',
          keyGenerator: (req) => req.ip,
        },
      },
    },
    async (request, reply) => {
      const parsed = cancelSelfBodySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' })
      }
      const { slug } = request.params
      const { token } = parsed.data

      const tenant = await prisma.tenant.findUnique({ where: { slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)

      const booking = await prisma.booking.findFirst({
        where: { cancelToken: token, tenantId: tenant.id },
        include: {
          slot: { select: { startsAt: true, package: { select: { name: true } } } },
        },
      })

      if (!booking) {
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
            from: getEmailFrom(),
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

      void notifyBookingEvent(app.log, booking.id, 'cancelled').catch(() => {})

      return reply.status(200).send({ message: 'Reserva cancelada com sucesso' })
    }
  )

  // POST /tenants/:slug/bookings/repay — public, no JWT — EXPIRED bookings only
  app.post<{ Params: { slug: string }; Body: RepayBody }>(
    '/tenants/:slug/bookings/repay',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
          keyGenerator: (req) => `repay:ip:${req.ip}`,
        },
      },
    },
    async (request, reply) => {
      const parsed = repayBodySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' })
      }
      const { slug } = request.params
      const { email, code, cpf } = parsed.data

      const tenant = await prisma.tenant.findUnique({ where: { slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)

      const normalizedEmail = email.trim().toLowerCase()

      // TODO WR-002: endsWith gera LIKE '%suffix' sem índice — migrar para campo `code String @unique`
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
      // CPF original não é recuperável (apenas hash armazenado) — cliente pode fornecer CPF no body
      const transactionAmount = Number(booking.slot.package.price) * booking.pax
      const paymentResult = await paymentService.createPixPayment({
        bookingId: booking.id,
        transactionAmount,
        description: `Reserva #${booking.id} — ${booking.slot.package.name}`,
        customerEmail: booking.customerEmail,
        customerCpf: cpf ?? '',
      })

      // Lock slot and update booking atomically to prevent race condition
      // CR-003: on DB failure, cancel the MP payment to avoid orphaned charges
      try { await prisma.$transaction(async (tx) => {
        const [slotRow] = await tx.$queryRaw<Array<{ status: string; booked: number; capacity: number }>>`
          SELECT status, booked, capacity FROM "DepartureSlot"
          WHERE id = ${booking.slotId}
          FOR UPDATE
        `
        if (!slotRow || slotRow.status !== 'OPEN') {
          // MP payment was created but slot is gone — log for manual reconciliation
          throw new AppError('Slot indisponível para novo pagamento', 422)
        }
        if (slotRow.booked + booking.pax > slotRow.capacity) {
          throw new AppError('SLOT_UNAVAILABLE', 409)
        }
        const newBooked = slotRow.booked + booking.pax
        await tx.departureSlot.update({
          where: { id: booking.slotId },
          data: {
            booked: { increment: booking.pax },
            status: newBooked >= slotRow.capacity ? 'FULL' : 'OPEN',
          },
        })
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
      }) } catch (txErr) {
        await paymentService.cancelPixPayment(paymentResult.paymentId).catch((e) => {
          app.log.error(e, '[repay] cancelPixPayment falhou após falha na transação DB')
        })
        throw txErr
      }

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
    { preHandler: [authenticate, authorize(['ADMIN', 'CONDUTOR', 'SUPER_ADMIN'])] },
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

      const user = request.user as { sub: string; role: string; tenantId: string }
      if (booking.tenantId !== user.tenantId) {
        throw new AppError('FORBIDDEN', 403)
      }
      if (user.role === 'CONDUTOR' && booking.slot?.package?.conductorId !== user.sub) {
        throw new AppError('Acesso negado', 403)
      }

      if (booking.status === 'CANCELLED') {
        throw new AppError('BOOKING_ALREADY_CANCELLED', 400)
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

      void notifyBookingEvent(app.log, updated.id, 'cancelled').catch(() => {})

      const { customerCpfHash, customerPhone, ...safeBooking } = updated
      return safeBooking
    }
  )

  app.patch(
    '/tenants/:slug/bookings/:id/confirm',
    { preHandler: [authenticate, authorize(['ADMIN', 'CONDUTOR', 'SUPER_ADMIN'])] },
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

      const user = request.user as { sub: string; role: string; tenantId: string }
      if (booking.tenantId !== user.tenantId) {
        throw new AppError('FORBIDDEN', 403)
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
    }
  )

  app.get(
    '/tenants/:slug/bookings',
    {
      onRequest: [authenticate, authorize(['ADMIN'])],
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
