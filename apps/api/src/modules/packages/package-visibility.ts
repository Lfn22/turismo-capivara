import type { Prisma } from '@prisma/client'

/**
 * Roteiro de destino arquivado some das listagens públicas e não aceita reserva nova.
 * O destino pode vir do próprio roteiro ou da operadora; sem destino, o roteiro segue visível.
 * Restaurar o destino traz os roteiros de volta (nada é alterado no roteiro).
 */
export const destinationNotArchived: Prisma.TourPackageWhereInput = {
  AND: [
    { OR: [{ destinationId: null }, { destination: { active: true } }] },
    { tenant: { OR: [{ destinationId: null }, { destination: { active: true } }] } },
  ],
}
