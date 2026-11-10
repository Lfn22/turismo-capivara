import prisma from '../../database'

export type MembershipBooking = { id: string; startsAt: string; packageName: string }

type Scope = { userId: string; guideProfileId: string; destinationId?: string; packageId?: string }

/**
 * Reservas futuras do guia (PENDING/CONFIRMED com saída posterior a agora) em que ele é o guia do
 * horário, ou o horário não tem guia e ele é o condutor do roteiro. Exige destinationId ou packageId.
 */
export async function findGuideFutureBookings(
  scope: Scope,
): Promise<Array<{ id: string; startsAt: Date; packageName: string; status: 'PENDING' | 'CONFIRMED' }>> {
  const { userId, guideProfileId, destinationId, packageId } = scope
  if (!destinationId && !packageId) {
    throw new Error('findGuideFutureBookings exige destinationId ou packageId')
  }

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED'] },
      slot: {
        startsAt: { gt: new Date() },
        OR: [
          { guideId: guideProfileId },
          { guideId: null, package: { conductorId: userId } },
        ],
        ...(packageId ? { packageId } : {}),
        ...(destinationId ? { package: { tenant: { destinationId } } } : {}),
      },
    },
    select: {
      id: true,
      status: true,
      slot: { select: { startsAt: true, package: { select: { name: true } } } },
    },
    orderBy: { slot: { startsAt: 'asc' } },
  })

  return bookings.map((b) => ({
    id: b.id,
    startsAt: b.slot.startsAt,
    packageName: b.slot.package.name,
    status: b.status as 'PENDING' | 'CONFIRMED',
  }))
}
