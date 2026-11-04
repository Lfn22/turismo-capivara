import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'

export const DESTINATION_LINKED_MESSAGE = 'Este destino tem agências ou roteiros ligados. Arquive em vez de excluir.'

// Destino com agências, guias ou roteiros ligados não pode ser excluído definitivamente.
export async function assertNoDestinationLinks(destinationId: string) {
  const where = { destinationId }
  const counts = await Promise.all([
    prisma.tenant.count({ where }),
    prisma.guideDestination.count({ where }),
    prisma.tenantDestination.count({ where }),
    prisma.tourPackage.count({ where }),
  ])
  if (counts.some((n) => n > 0)) {
    throw new AppError(DESTINATION_LINKED_MESSAGE, 409)
  }
}
