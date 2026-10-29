import type { FastifyBaseLogger } from 'fastify'
import prisma from '../../database'
import { notify, tenantAdminIds } from './notifications.service'

export type BookingEventKind = 'created' | 'confirmed' | 'expired' | 'cancelled'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** Notifica turista (se tiver conta) e equipe do roteiro. Nunca lança. */
export async function notifyBookingEvent(
  log: FastifyBaseLogger,
  bookingId: string,
  kind: BookingEventKind,
): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        userId: true,
        customerName: true,
        pax: true,
        tenantId: true,
        tenant: { select: { slug: true } },
        slot: {
          select: {
            startsAt: true,
            package: { select: { name: true, conductorId: true } },
          },
        },
      },
    })
    if (!booking) return

    const packageName = booking.slot.package.name
    const date = dateFormatter.format(booking.slot.startsAt)
    const slug = booking.tenant.slug

    const content = {
      created: {
        title: 'Nova reserva',
        body: `${booking.customerName} · ${packageName} · ${booking.pax} pessoa(s)`,
      },
      confirmed: { title: 'Reserva confirmada', body: `${packageName} em ${date}` },
      expired: { title: 'Reserva expirada', body: `${packageName} — pagamento não concluído` },
      cancelled: { title: 'Reserva cancelada', body: `${packageName} em ${date}` },
    }[kind]
    const type = `booking.${kind}`

    if (booking.userId) {
      await notify({ userIds: [booking.userId], type, ...content, link: `/${slug}/minha-reserva` })
    }

    const adminIds = await tenantAdminIds(booking.tenantId)
    const staffIds = [booking.slot.package.conductorId, ...adminIds].filter(
      (id): id is string => !!id && id !== booking.userId,
    )
    await notify({ userIds: staffIds, type, ...content, link: `/${slug}/painel/reservas` })
  } catch (err) {
    log.warn({ err, bookingId }, '[notif] Falha ao notificar evento de reserva')
  }
}
