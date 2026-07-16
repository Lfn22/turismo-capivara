import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { CreateDestinationInputType, UpdateDestinationInputType } from './destinations.schemas'

async function geocode(name: string, state?: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = state ? `${name}, ${state}, Brasil` : `${name}, Brasil`
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'turismo-capivara/1.0 (contato@capivara.app)' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ lat: string; lon: string }>
    if (!data.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

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
    where: { OR: [{ slug: base }, { slug: { startsWith: `${base}-` } }] },
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
  userRole?: string,
) {
  const baseSlug = slugify(input.name)
  const slug = await uniqueSlug(baseSlug)

  // Verify tenant exists
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } })
  if (!tenant) throw new AppError('Tenant não encontrado', 404)

  const coords = await geocode(input.name, input.state)

  const destination = await prisma.destination.create({
    data: {
      slug,
      title: input.name,
      description: input.description,
      state: input.state,
      photos: input.photos ?? [],
      highlights: input.highlights ?? [],
      approvalStatus: userRole === 'ADMIN' ? 'APPROVED' : 'PENDING',
      createdById: userId,
      ...(coords && { lat: coords.lat, lng: coords.lng }),
    },
    select: { id: true, slug: true, title: true, state: true, description: true, highlights: true, photos: true, approvalStatus: true, createdAt: true, createdById: true, lat: true, lng: true },
  })

  return destination
}

export async function updateDestination(
  destinationId: string,
  userId: string,
  input: UpdateDestinationInputType,
  userRole?: string,
) {
  const destination = await prisma.destination.findUnique({
    where: { id: destinationId },
    select: { id: true, approvalStatus: true, createdById: true },
  })

  if (!destination) throw new AppError('Destino não encontrado', 404)

  // ADMIN pode editar qualquer destino do tenant (sem restrição de criador)
  if (userRole !== 'ADMIN') {
    // createdById pode ser null em destinos criados antes da Phase 14 — tratar como não autorizado
    if (!destination.createdById || destination.createdById !== userId) {
      throw new AppError('Não autorizado', 403)
    }
    if (destination.approvalStatus === 'APPROVED') {
      throw new AppError('Não é possível editar destino aprovado', 400)
    }
  }

  let coords: { lat: number; lng: number } | null = null
  if (input.name !== undefined) {
    coords = await geocode(input.name, input.state)
  }

  const updated = await prisma.destination.update({
    where: { id: destinationId },
    data: {
      ...(input.name !== undefined && { title: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.state !== undefined && { state: input.state }),
      ...(input.photos !== undefined && { photos: input.photos }),
      ...(input.highlights !== undefined && { highlights: input.highlights }),
      ...(coords && { lat: coords.lat, lng: coords.lng }),
    },
    select: { id: true, slug: true, title: true, state: true, description: true, highlights: true, photos: true, approvalStatus: true, createdAt: true, createdById: true, lat: true, lng: true },
  })

  return updated
}

export async function approveDestination(destinationId: string) {
  const destination = await prisma.destination.findUnique({
    where: { id: destinationId },
    select: { id: true, approvalStatus: true },
  })

  if (!destination) throw new AppError('Destino não encontrado', 404)

  if (destination.approvalStatus !== 'PENDING') {
    throw new AppError('Destino não está pendente', 400)
  }

  return prisma.destination.update({
    where: { id: destinationId },
    data: { approvalStatus: 'APPROVED' },
    select: { id: true, slug: true, title: true, approvalStatus: true },
  })
}

export async function rejectDestination(destinationId: string, reason?: string) {
  const destination = await prisma.destination.findUnique({
    where: { id: destinationId },
    select: { id: true, approvalStatus: true },
  })

  if (!destination) throw new AppError('Destino não encontrado', 404)

  if (destination.approvalStatus !== 'PENDING') {
    throw new AppError('Destino não está pendente', 400)
  }

  return prisma.destination.update({
    where: { id: destinationId },
    data: {
      approvalStatus: 'REJECTED',
      rejectionReason: reason ?? null,
    },
    select: { id: true, slug: true, title: true, approvalStatus: true, rejectionReason: true },
  })
}

export async function deleteDestination(destinationId: string, userId: string, userRole?: string) {
  const destination = await prisma.destination.findUnique({
    where: { id: destinationId },
    select: { id: true, approvalStatus: true, createdById: true },
  })

  if (!destination) throw new AppError('Destino não encontrado', 404)

  if (userRole !== 'ADMIN' && destination.createdById !== userId) {
    throw new AppError('Não autorizado', 403)
  }

  if (userRole !== 'ADMIN' && destination.approvalStatus === 'APPROVED') {
    throw new AppError('Não é possível excluir destino aprovado. Entre em contato com o suporte.', 400)
  }

  await prisma.destination.delete({ where: { id: destinationId } })

  return { success: true }
}
