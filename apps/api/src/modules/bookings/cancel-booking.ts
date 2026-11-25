import type { FastifyBaseLogger } from 'fastify'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { refundPayment, cancelPixPayment } from '../../services/payment.service'

export interface CancellableBooking {
  id: string
  status: string
  slotId: string
  pax: number
  paymentId: string | null
}

/**
 * Cancela uma reserva PENDING/CONFIRMED (cliente ou equipe):
 *  - CONFIRMED: estorna no MP ANTES de cancelar; se o estorno falhar, nada é cancelado.
 *  - Transição condicional ao status lido — corrida (job de expiração, webhook,
 *    clique duplo) responde 409 e nunca libera a vaga duas vezes.
 *  - PENDING: cancela a cobrança PIX (melhor esforço; se o cliente pagar mesmo assim,
 *    o webhook estorna o pagamento de reserva cancelada).
 */
export async function cancelBooking(
  booking: CancellableBooking,
  log: Pick<FastifyBaseLogger, 'warn' | 'error'>,
): Promise<void> {
  if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
    throw new AppError('Reserva não pode ser cancelada neste status', 422)
  }

  if (booking.status === 'CONFIRMED' && booking.paymentId) {
    try {
      await refundPayment(booking.paymentId)
    } catch (err) {
      log.error({ err, bookingId: booking.id }, '[cancel] Estorno falhou — reserva mantida')
      throw new AppError(
        'Não foi possível estornar o pagamento. A reserva não foi cancelada; tente novamente.',
        502,
      )
    }
  }

  const cancelled = await prisma.$transaction(async (tx) => {
    const res = await tx.booking.updateMany({
      where: { id: booking.id, status: booking.status as 'PENDING' | 'CONFIRMED' },
      data: { status: 'CANCELLED' },
    })
    if (res.count === 0) return false

    const [slot] = await tx.$queryRaw<Array<{ booked: number; capacity: number; status: string }>>`
      SELECT booked, capacity, status FROM "DepartureSlot"
      WHERE id = ${booking.slotId}
      FOR UPDATE
    `
    if (slot) {
      await tx.departureSlot.update({
        where: { id: booking.slotId },
        data: {
          booked: Math.max(0, slot.booked - booking.pax),
          // FULL volta a OPEN; CANCELLED/COMPLETED são preservados
          ...(slot.status === 'FULL' ? { status: 'OPEN' as const } : {}),
        },
      })
    }
    return true
  })

  if (!cancelled) {
    throw new AppError(
      'A reserva foi alterada por outra operação. Atualize e tente novamente.',
      409,
    )
  }

  if (booking.status === 'PENDING' && booking.paymentId) {
    await cancelPixPayment(booking.paymentId).catch((err) => {
      log.error({ err, bookingId: booking.id }, '[cancel] Falha ao cancelar a cobrança PIX no MP')
    })
  }
}
