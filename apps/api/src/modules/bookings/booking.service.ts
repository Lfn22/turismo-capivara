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
  logger: { error: Function; info: Function }
): Promise<CreateBookingResult> {
  const {
    tenantId,
    slotId,
    customerName,
    customerEmail,
    customerPhone,
    cpf,
    pax,
    idempotencyKey,
  } = input

  // Tx 1: Lock slot, validate and increment — booking NOT created yet (PAY-02)
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

  // Guard: package must exist to build a valid PIX amount — rollback slot if missing
  if (!pkg) {
    await prisma.$transaction(async (tx) => {
      const s1 = await tx.departureSlot.findUnique({ where: { id: slotId }, select: { status: true } })
      await tx.departureSlot.update({
        where: { id: slotId },
        data: { booked: { decrement: pax }, ...(s1?.status === 'FULL' ? { status: 'OPEN' } : {}) },
      })
    })
    throw new AppError('Pacote não encontrado para este slot', 500)
  }

  // MP call happens OUTSIDE $transaction — per D-02
  // booking does NOT exist yet; paymentId will be set on create (PAY-02)
  // CR-001 fix: pre-generate ID so external_reference matches the real booking.id
  const bookingId = createId()
  let paymentResult
  try {
    paymentResult = await paymentService.createPixPayment({
      bookingId,
      transactionAmount: Number(pkg.price) * pax,
      description: `Reserva — ${pkg.name}`,
      customerEmail,
      customerCpf: cpf,
    })
  } catch (err) {
    // Compensation: restore slot atomically (per D-02)
    await prisma.$transaction(async (tx) => {
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

  // Tx 2: Create booking with paymentId already in hand — never exists without PIX data (PAY-02)
  // CR-05: wrap Tx2 in try/catch — if DB fails after PIX succeeds, cancel the MP payment + restore slot
  let booking
  try {
    booking = await prisma.$transaction(async (tx) => {
      const cancelToken = randomBytes(32).toString('hex')
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
          expiresAt: paymentResult.expiresAt,
          idempotencyKey: idempotencyKey ?? null,
          paymentId: paymentResult.paymentId,
          paymentUrl: paymentResult.paymentUrl,
          qrCode: paymentResult.qrCode,
          cancelToken,
          cancelTokenExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        },
      })
    })
  } catch (tx2Err) {
    // CR-05: compensate — cancel MP payment + restore slot
    await paymentService.cancelPixPayment(paymentResult.paymentId).catch((e) => {
      logger.error(e, '[booking-create] cancelPixPayment falhou após falha no Tx2')
    })
    await prisma.$transaction(async (tx) => {
      const s3 = await tx.departureSlot.findUnique({ where: { id: slotId }, select: { status: true } })
      await tx.departureSlot.update({
        where: { id: slotId },
        data: {
          booked: { decrement: pax },
          ...(s3?.status === 'FULL' ? { status: 'OPEN' } : {}),
        },
      })
    })
    throw tx2Err
  }

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
