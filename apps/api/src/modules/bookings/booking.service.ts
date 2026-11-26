import { randomBytes } from 'crypto'
import { createId } from '@paralleldrive/cuid2'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { assertBeforeBookingCutoff } from './booking-cutoff'
import { lineTotal } from '../../shared/utils/money'
import { hashCpf } from '../../shared/utils/hash'
import * as paymentService from '../../services/payment.service'

export interface CreateBookingInput {
  tenantId: string
  tenantSlug: string
  slotId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  cpf: string
  pax: number
  expiryMinutes: number
  idempotencyKey?: string | null
  userId: string | null
}

export interface CreateBookingResult {
  booking: {
    id: string
    tenantId: string
    slotId: string
    customerName: string
    customerEmail: string
    customerPhone: string | null
    pax: number
    status: string
    expiresAt: Date | null
    createdAt: Date
    paymentId: string | null
    paymentUrl: string | null
    qrCode: string | null
    cancelToken: string
  }
  paymentUrl: string
  qrCode: string
  cancelToken: string
  conductorEmail: string | null
  departureStartsAt: Date
  packageName: string
}

function isBookingCodeCollision(err: unknown): boolean {
  const e = err as { code?: string; meta?: { target?: unknown } } | null
  return e?.code === 'P2002' && String(e.meta?.target ?? '').includes('code')
}

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const {
    tenantId,
    slotId,
    customerName,
    customerEmail,
    customerPhone,
    cpf,
    pax,
    expiryMinutes,
    idempotencyKey,
    userId,
  } = input

  // C-2: expiry is decided from OUR clock, before any external call, so the booking row
  // can be written durably up front. BOOKING_EXPIRY_MINUTES is actually honoured (A-4).
  const expiresAt = new Date(Date.now() + expiryMinutes * 60_000)
  let bookingId = createId()
  const cancelToken = randomBytes(32).toString('hex')

  // Single transaction: lock the slot, validate, increment seats AND persist the booking.
  //
  // C-2: seats are never held without a Booking row that the expiry job can find and reverse.
  // C-3: the idempotency key is claimed by the unique constraint inside this same
  // transaction, so a losing concurrent request rolls back the seat increment too.
  // The caller handles the resulting P2002 by returning the winner's booking.
  // O código de consulta (6 últimos caracteres do id) é único por tenant: numa colisão
  // rara, gera outro id e repete — sem isto o turista recebia 500
  for (let attempt = 1; ; attempt++) {
    try {
      await prisma.$transaction(async (tx) => {
        // Lock the slot row to prevent concurrent overbooking (WR-04)
        const [slot] = await tx.$queryRaw<
          Array<{
            id: string
            booked: number
            capacity: number
            status: string
            packageId: string
            tenantId: string
            active: boolean
            publishedAt: Date | null
            destinationActive: boolean
            startsAt: Date
          }>
        >`
          SELECT ds.id, ds.booked, ds.capacity, ds.status, ds."packageId", ds."startsAt", tp."tenantId", tp.active, tp."publishedAt",
                 (COALESCE(pd.active, true) AND COALESCE(td.active, true)) AS "destinationActive"
          FROM "DepartureSlot" ds
          JOIN "TourPackage" tp ON tp.id = ds."packageId"
          JOIN "Tenant" t ON t.id = tp."tenantId"
          LEFT JOIN "Destination" pd ON pd.id = tp."destinationId"
          LEFT JOIN "Destination" td ON td.id = t."destinationId"
          WHERE ds.id = ${slotId}
          FOR UPDATE OF ds, tp
        `

        if (!slot) {
          throw new AppError('Slot não encontrado', 404)
        }

        if (slot.tenantId !== tenantId) {
          throw new AppError('Slot não encontrado', 404)
        }

        // Roteiro em rascunho (publishedAt null), arquivado ou de destino arquivado não aceita reserva
        if (
          slot.status !== 'OPEN' ||
          !slot.active ||
          slot.publishedAt === null ||
          slot.destinationActive === false
        ) {
          throw new AppError('Slot indisponível', 400)
        }

        if (slot.booked + pax > slot.capacity) {
          throw new AppError('Capacidade insuficiente', 400)
        }

        assertBeforeBookingCutoff(slot.startsAt)

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
            // 6 caracteres: o mesmo que o lookup valida, o web exibe e a migration preencheu
            code: bookingId.slice(-6),
            tenantId,
            slotId,
            customerName,
            customerEmail,
            customerPhone,
            customerCpfHash: hashCpf(cpf),
            pax,
            status: 'PENDING',
            expiresAt,
            idempotencyKey: idempotencyKey ?? null,
            cancelToken,
            cancelTokenExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
            userId,
          },
        })
      })
      break
    } catch (err) {
      if (attempt < 3 && isBookingCodeCollision(err)) {
        bookingId = createId()
        continue
      }
      throw err
    }
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
      const slot = await tx.departureSlot.findUnique({
        where: { id: slotId },
        select: { status: true },
      })
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
    throw new AppError('Pacote não encontrado para este slot', 404)
  }

  // MP call stays OUTSIDE the transaction (per D-02) — a network round-trip must never
  // hold a row lock. external_reference matches the booking id already persisted.
  let paymentResult
  try {
    paymentResult = await paymentService.createPixPayment({
      bookingId,
      transactionAmount: lineTotal(pkg.price, pax),
      description: `Reserva — ${pkg.name}`,
      customerEmail,
      customerCpf: cpf,
      expiresAt,
    })
  } catch (err) {
    await releaseBooking()
    throw err // AppError 502 propagates to error handler
  }

  // If this write fails the booking stays PENDING: the webhook still finds it through
  // external_reference, and the expiry job releases the seats if it is never paid.
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      paymentId: paymentResult.paymentId,
      paymentUrl: paymentResult.paymentUrl,
      qrCode: paymentResult.qrCode,
    },
  })

  return {
    booking,
    paymentUrl: paymentResult.paymentUrl,
    qrCode: paymentResult.qrCode,
    cancelToken: booking.cancelToken,
    conductorEmail: pkg.conductor?.email ?? null,
    departureStartsAt: pkg.departureSlots.length > 0 ? pkg.departureSlots[0].startsAt : new Date(),
    packageName: pkg.name,
  }
}
