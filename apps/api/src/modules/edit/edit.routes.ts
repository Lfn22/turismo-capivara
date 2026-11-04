import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { parseParams } from '../../shared/utils/zod-error'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { isPlatformStaff } from '../../shared/auth/roles'
import { canCreatePackageIn, canEditDestination, canEditPackage, canManageDestinations, EditUser } from '../../shared/auth/edit-permissions'

const paramsSchema = z.object({
  destinationSlug: z.string().min(1, { message: 'Slug obrigatório' }),
})

// Guia só entra no modo edição depois de verificado. Confere no banco: o claim do JWT pode estar velho.
async function requireVerifiedConductor(request: FastifyRequest, reply: FastifyReply) {
  if (request.user.role !== 'CONDUTOR') return
  const user = await prisma.user.findUnique({ where: { id: request.user.sub }, select: { approvalStatus: true } })
  if (!user || user.approvalStatus !== 'APPROVED') {
    return reply.status(403).send({ message: 'Disponível após verificação' })
  }
}

// Destino ligado ao tenant do ADMIN (regra de GET /destinations/:slug/packages: Tenant.destinationId).
async function linkedTenant(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      slug: true,
      name: true,
      destination: { select: { id: true, slug: true, title: true } },
    },
  })
}

export async function editRoutes(app: FastifyInstance) {
  const guard = {
    preHandler: [authenticate, authorize(['SUPER_ADMIN', 'ADMIN', 'CONDUTOR']), requireVerifiedConductor],
  }

  app.get('/edit/scope', guard, async (request, reply) => {
    const user = request.user as EditUser

    if (isPlatformStaff(user.role)) {
      return reply.status(200).send({
        destinations: 'ALL',
        packages: 'ALL',
        canManageDestinations: canManageDestinations(user),
        label: 'Você pode editar: todos os destinos e roteiros',
      })
    }

    if (user.role === 'CONDUTOR') {
      return reply.status(200).send({
        destinations: [],
        packages: { conductorId: user.sub },
        canManageDestinations: false,
        label: 'Você pode editar: seus roteiros',
      })
    }

    const tenant = await linkedTenant(user.tenantId)
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    return reply.status(200).send({
      destinations: tenant.destination ? [tenant.destination.slug] : [],
      packages: { tenantId: tenant.id, tenantSlug: tenant.slug },
      canManageDestinations: false,
      label: tenant.destination
        ? `Você pode editar: página de ${tenant.destination.title} e roteiros da ${tenant.name}`
        : `Você pode editar: roteiros da ${tenant.name}`,
    })
  })

  app.get('/edit/destinations', guard, async (request, reply) => {
    const user = request.user as EditUser
    let where: { id: string } | undefined

    if (!isPlatformStaff(user.role)) {
      if (user.role !== 'ADMIN') return reply.status(200).send({ destinations: [] })
      const tenant = await linkedTenant(user.tenantId)
      if (!tenant?.destination) return reply.status(200).send({ destinations: [] })
      where = { id: tenant.destination.id }
    }

    const destinations = await prisma.destination.findMany({
      ...(where ? { where } : {}),
      select: { slug: true, title: true, state: true, heroImageUrl: true, approvalStatus: true, active: true },
      orderBy: { title: 'asc' },
    })

    return reply.status(200).send({ destinations })
  })

  app.get('/edit/destinations/:destinationSlug', guard, async (request, reply) => {
    const { data: params, error } = parseParams(paramsSchema, request.params, reply)
    if (error) return

    const destination = await prisma.destination.findUnique({
      where: { slug: params.destinationSlug },
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        description: true,
        state: true,
        highlights: true,
        heroImageUrl: true,
        heroImageBlurDataUrl: true,
        photos: true,
        tagline: true,
        lat: true,
        lng: true,
        approvalStatus: true,
        active: true,
      },
    })
    if (!destination) throw new AppError('Destino não encontrado', 404)
    if (!(await canEditDestination(request.user as EditUser, destination.id))) {
      throw new AppError('Acesso negado', 403)
    }

    return reply.status(200).send(destination)
  })

  app.get('/edit/destinations/:destinationSlug/packages', guard, async (request, reply) => {
    const { data: params, error } = parseParams(paramsSchema, request.params, reply)
    if (error) return
    const user = request.user as EditUser

    const destination = await prisma.destination.findUnique({
      where: { slug: params.destinationSlug },
      select: { id: true, active: true, approvalStatus: true },
    })
    if (!destination) throw new AppError('Destino não encontrado', 404)

    // Destino oculto ou pendente só aparece para quem pode editá-lo.
    const isPublic = destination.active === true && destination.approvalStatus === 'APPROVED'
    if (!isPublic && !(await canEditDestination(user, destination.id))) {
      throw new AppError('Destino não encontrado', 404)
    }

    const packages = await prisma.tourPackage.findMany({
      where: { tenant: { destinationId: destination.id } },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        duration: true,
        capacity: true,
        difficulty: true,
        photos: true,
        highlights: true,
        active: true,
        publishedAt: true,
        tenantId: true,
        conductorId: true,
        tenant: { select: { slug: true } },
      },
      orderBy: { name: 'asc' },
    })

    const result = packages
      .map((p) => ({ p, editable: canEditPackage(user, p) }))
      .filter(({ p, editable }) => editable || (p.active && p.publishedAt !== null))
      .map(({ p, editable }) => ({
        id: p.id,
        tenantSlug: p.tenant.slug,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        duration: p.duration,
        capacity: p.capacity,
        difficulty: p.difficulty,
        photos: p.photos,
        highlights: p.highlights,
        active: p.active,
        publishedAt: p.publishedAt,
        status: !p.active ? 'HIDDEN' : p.publishedAt === null ? 'DRAFT' : 'PUBLISHED',
        editable,
      }))

    const linked = await prisma.tenant.findMany({
      where: { destinationId: destination.id },
      select: { id: true, slug: true, name: true },
      orderBy: { name: 'asc' },
    })
    const creatableTenants = linked
      .filter((t) => canCreatePackageIn(user, t.id))
      .map((t) => ({ slug: t.slug, name: t.name }))

    return reply.status(200).send({ packages: result, creatableTenants })
  })
}
