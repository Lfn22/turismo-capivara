import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { CreateDestinationInputType, UpdateDestinationInputType } from './destinations.schemas'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
}

async function uniqueSlug(base: string): Promise<string> {
  const existing = await prisma.destination.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  })
  const slugs = new Set(existing.map((d) => d.slug))
  if (!slugs.has(base)) return base
  let counter = 2
  while (slugs.has(`${base}-${counter}`)) counter++
  return `${base}-${counter}`
}

export async function createDestination(
  tenantId: string,
  userId: string,
  input: CreateDestinationInputType,
) {
  const baseSlug = slugify(input.name)
  const slug = await uniqueSlug(baseSlug)

  // Verify tenant exists
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new AppError('Tenant não encontrado', 404)

  const destination = await prisma.destination.create({
    data: {
      slug,
      title: input.name,
      description: input.description,
      state: input.state,
      photos: input.photos ?? [],
      highlights: input.highlights ?? [],
      approvalStatus: 'PENDING',
      createdById: userId,
    },
  })

  return destination
}

export async function updateDestination(
  destinationId: string,
  userId: string,
  input: UpdateDestinationInputType,
) {
  const destination = await prisma.destination.findUnique({
    where: { id: destinationId },
  })

  if (!destination) throw new AppError('Destino não encontrado', 404)

  if (destination.createdById !== userId) {
    throw new AppError('Não autorizado', 403)
  }

  if (destination.approvalStatus === 'APPROVED') {
    throw new AppError('Não é possível editar destino aprovado', 400)
  }

  const updated = await prisma.destination.update({
    where: { id: destinationId },
    data: {
      ...(input.name !== undefined && { title: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.state !== undefined && { state: input.state }),
      ...(input.photos !== undefined && { photos: input.photos }),
      ...(input.highlights !== undefined && { highlights: input.highlights }),
    },
  })

  return updated
}

export async function approveDestination(destinationId: string) {
  const destination = await prisma.destination.findUnique({
    where: { id: destinationId },
  })

  if (!destination) throw new AppError('Destino não encontrado', 404)

  if (destination.approvalStatus !== 'PENDING') {
    throw new AppError('Destino não está pendente', 400)
  }

  return prisma.destination.update({
    where: { id: destinationId },
    data: { approvalStatus: 'APPROVED' },
  })
}

export async function rejectDestination(destinationId: string) {
  const destination = await prisma.destination.findUnique({
    where: { id: destinationId },
  })

  if (!destination) throw new AppError('Destino não encontrado', 404)

  if (destination.approvalStatus !== 'PENDING') {
    throw new AppError('Destino não está pendente', 400)
  }

  return prisma.destination.update({
    where: { id: destinationId },
    data: { approvalStatus: 'REJECTED' },
  })
}

export async function deleteDestination(destinationId: string, userId: string) {
  const destination = await prisma.destination.findUnique({
    where: { id: destinationId },
  })

  if (!destination) throw new AppError('Destino não encontrado', 404)

  if (destination.createdById !== userId) {
    throw new AppError('Não autorizado', 403)
  }

  await prisma.destination.delete({ where: { id: destinationId } })

  return { success: true }
}
