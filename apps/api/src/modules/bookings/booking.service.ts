import { randomBytes } from 'crypto'
import { createId } from '@paralleldrive/cuid2'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
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

export async function createBooking(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
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
  const bookingId = createId()
  const cancelToken = randomBytes(32).toString('hex')

  // Single transaction: lock the slot, validate, increment seats AND persist the booking.
  //
  // C-2: seats are never held without a Booking row that the expiry job can find and reverse.
  // C-3: the idempotency key is claimed by the unique constraint inside this same
  // transaction, so a losing concurrent request rolls back the seat increment too.
  // The caller handles the resulting P2002 by returning the winner's booking.
  await prisma.$transaction(async (tx) => {
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

    if (slot.tenantId !== tenantId) {
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
    paymentResult = await paymentService.createPixPayment({
      bookingId,
      transactionAmount: Number(pkg.price) * pax,
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
    departureStartsAt: pkg.departureSlots[0]?.startsAt ?? new Date(),
    packageName: pkg.name,
  }
}
