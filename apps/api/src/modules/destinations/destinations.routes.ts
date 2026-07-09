import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { ApprovalUpdateInput, CreateDestinationInput, UpdateDestinationInput } from './destinations.schemas'
import {
  approveDestination,
  createDestination,
  deleteDestination,
  rejectDestination,
  updateDestination,
} from './destinations.service'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

function zodError(err: ZodError) {
  return {
    message: 'Dados inválidos',
    errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
  }
}

export async function destinationsRoutes(app: FastifyInstance) {
  // GET /destinations — lista destinos aprovados (público)
  app.get('/destinations', async (_request, reply) => {
    const destinations = await prisma.destination.findMany({
      where: { active: true, approvalStatus: 'APPROVED' },
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        state: true,
        heroImageUrl: true,
        heroImageBlurDataUrl: true,
        photos: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return reply.status(200).send(destinations)
  })

  // GET /destinations/:slug — detalhe de um destino (público)
  app.get('/destinations/:slug', async (request, reply) => {
    let params
    try {
      params = slugParamsSchema.parse(request.params)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError(err))
      throw err
    }

    const destination = await prisma.destination.findUnique({
      where: { slug: params.slug, active: true },
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
        approvalStatus: true,
      },
    })

    if (!destination) throw new AppError('Destino não encontrado', 404)
    if (destination.approvalStatus !== 'APPROVED') throw new AppError('Destino não encontrado', 404)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { approvalStatus: _status, ...publicDestination } = destination
    return reply.status(200).send(publicDestination)
  })

  // GET /destinations/:slug/guides — guias aprovados do destino (público)
  app.get('/destinations/:slug/guides', async (request, reply) => {
    let params
    try {
      params = slugParamsSchema.parse(request.params)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError(err))
      throw err
    }

    const destination = await prisma.destination.findUnique({
      where: { slug: params.slug, active: true },
      select: { id: true },
    })

    if (!destination) throw new AppError('Destino não encontrado', 404)

    const guides = await prisma.guideProfile.findMany({
      where: {
        user: {
          role: 'CONDUTOR',
          approvalStatus: 'APPROVED',
          tenant: {
            destinationId: destination.id,
          },
        },
      },
      select: {
        id: true,
        photoUrl: true,
        especialidades: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    })

    const response = guides.map((g) => ({
      id: g.id,
      name: g.user.name,
      photoUrl: g.photoUrl,
      photoBlurDataUrl: null,
      specialties: g.especialidades,
      packageCount: 0, // TODO: contar TourPackages ativos por guia
      rating: null,
      reviewCount: null,
    }))

    return reply.status(200).send(response)
  })

  // GET /destinations/:slug/guides/:guideId — perfil completo de um guia (público)
  app.get('/destinations/:slug/guides/:guideId', async (request, reply) => {
    const guideParamsSchema = z.object({
      slug: z.string().min(1),
      guideId: z.string().min(1),
    })
    let params
    try {
      params = guideParamsSchema.parse(request.params)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError(err))
      throw err
    }

    const destination = await prisma.destination.findUnique({
      where: { slug: params.slug, active: true },
      select: { id: true },
    })

    if (!destination) throw new AppError('Destino não encontrado', 404)

    const guide = await prisma.guideProfile.findFirst({
      where: {
        id: params.guideId,
        user: {
          role: 'CONDUTOR',
          approvalStatus: 'APPROVED',
          tenant: { destinationId: destination.id },
        },
      },
      select: {
        id: true,
        photoUrl: true,
        bio: true,
        especialidades: true,
        regioes: true,
        portfolioPhotos: true,
        user: {
          select: {
            name: true,
            tenant: { select: { slug: true } },
            tourPackages: {
              where: { active: true },
              select: {
                id: true,
                name: true,
                description: true,
                duration: true,
                price: true,
                difficulty: true,
                departureSlots: {
                  where: {
                    startsAt: { gte: new Date() },
                    status: 'OPEN',
                  },
                  select: {
                    id: true,
                    startsAt: true,
                    capacity: true,
                    booked: true,
                    status: true,
                  },
                  orderBy: { startsAt: 'asc' },
                  take: 5,
                },
              },
              orderBy: { price: 'asc' },
            },
          },
        },
      },
    })

    if (!guide) throw new AppError('Guia não encontrado', 404)

    return reply.status(200).send({
      id: guide.id,
      name: guide.user.name,
      photoUrl: guide.photoUrl,
      bio: guide.bio,
      specialties: guide.especialidades,
      regions: guide.regioes,
      portfolioPhotos: guide.portfolioPhotos,
      tenantSlug: guide.user.tenant.slug,
      packages: guide.user.tourPackages.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        duration: p.duration,
        price: Number(p.price),
        difficulty: p.difficulty,
        departureSlots: p.departureSlots.map((s) => ({
          id: s.id,
          startsAt: s.startsAt,
          capacity: s.capacity,
          booked: s.booked,
          status: s.status,
        })),
      })),
    })
  })

  // GET /destinations/:slug/packages — pacotes ativos de um destino aprovado (público)
  app.get('/destinations/:slug/packages', async (request, reply) => {
    let params
    try {
      params = slugParamsSchema.parse(request.params)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send(zodError(err))
      throw err
    }

    const destination = await prisma.destination.findUnique({
      where: { slug: params.slug, active: true, approvalStatus: 'APPROVED' },
      select: { id: true },
    })

    if (!destination) throw new AppError('Destino não encontrado', 404)

    const packages = await prisma.tourPackage.findMany({
      where: {
        active: true,
        tenant: {
          destinationId: destination.id,
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        duration: true,
        price: true,
        difficulty: true,
        durationMinHours: true,
        durationMaxHours: true,
        tenant: {
          select: { slug: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return reply.status(200).send(
      packages.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        duration: p.duration,
        price: Number(p.price),
        difficulty: p.difficulty,
        durationMinHours: p.durationMinHours,
        durationMaxHours: p.durationMaxHours,
        tenantSlug: p.tenant.slug,
      }))
    )
  })

  // PATCH /destinations/:destinationSlug — atualiza fotos (ADMIN/SUPER_ADMIN/CONDUTOR)
  // CONDUTOR só pode editar o destino vinculado ao seu próprio tenant
  // NOTE: Esta rota chama prisma.destination.update() diretamente, sem passar por updateDestination().
  // Isso é intencional: o serviço updateDestination() bloqueia edições em destinos APPROVED para
  // usuários não-admin. Admins precisam editar destinos aprovados via esta rota. Qualquer refatoração
  // que redirecione esta rota pelo serviço deve preservar essa distinção explicitamente.
  app.patch(
    '/destinations/:destinationSlug',
    { preHandler: [authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'CONDUTOR'])] },
    async (request, reply) => {
      const destinationParamsSchema = z.object({
        destinationSlug: z.string().min(1, { message: 'Slug obrigatório' }),
      })
      let params
      try {
        const raw = destinationParamsSchema.parse(request.params)
        params = { slug: raw.destinationSlug }
      } catch (err) {
        if (err instanceof ZodError) return reply.status(400).send(zodError(err))
        throw err
      }

      // Escopo de tenant: CONDUTOR só edita o destino do seu próprio tenant
      if (request.user.role === 'CONDUTOR') {
        const tenant = await prisma.tenant.findUnique({
          where: { id: request.user.tenantId },
          select: { destination: { select: { slug: true } } },
        })
        if (tenant?.destination?.slug !== params.slug) {
          throw new AppError('Acesso negado a este destino', 403)
        }
      }

      const bodySchema = z.object({
        heroImageUrl: z.string().url().nullable().optional(),
        photos: z.array(z.string().url()).max(5).optional(),
        title: z.string().min(1).optional(),
        subtitle: z.string().nullable().optional(),
        description: z.string().optional(),
        highlights: z.array(z.string().min(1)).optional(),
        tagline: z.string().nullable().optional(),
      })

      let body
      try {
        body = bodySchema.parse(request.body)
      } catch (err) {
        if (err instanceof ZodError) return reply.status(400).send(zodError(err))
        throw err
      }

      const destination = await prisma.destination.findUnique({
        where: { slug: params.slug },
        select: { id: true },
      })

      if (!destination) throw new AppError('Destino não encontrado', 404)

      const updated = await prisma.destination.update({
        where: { slug: params.slug },
        data: {
          ...(body.heroImageUrl !== undefined && { heroImageUrl: body.heroImageUrl }),
          ...(body.photos !== undefined && { photos: body.photos }),
          ...(body.title !== undefined && { title: body.title }),
          ...(body.subtitle !== undefined && { subtitle: body.subtitle }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.highlights !== undefined && { highlights: body.highlights }),
          ...(body.tagline !== undefined && { tagline: body.tagline }),
        },
        select: {
          slug: true,
          heroImageUrl: true,
          photos: true,
        },
      })

      return reply.status(200).send(updated)
    },
  )

  // GET /tenants/:slug/destinations — lista destinos do tenant (ADMIN/CONDUTOR/ATENDENTE)
  app.get(
    '/tenants/:slug/destinations',
    { preHandler: [authenticate, authorize(['ADMIN', 'CONDUTOR', 'ATENDENTE'])] },
    async (request, reply) => {
      // CONDUTOR vê apenas seus próprios destinos; ADMIN/ATENDENTE vê todos
      const whereClause =
        request.user.role === 'CONDUTOR'
          ? { createdById: request.user.sub }
          : { approvalStatus: { in: ['PENDING', 'APPROVED', 'REJECTED'] as ('PENDING' | 'APPROVED' | 'REJECTED')[] } }

      const destinations = await prisma.destination.findMany({
        where: whereClause,
        select: {
          id: true,
          slug: true,
          title: true,
          state: true,
          approvalStatus: true,
          rejectionReason: true,
          createdAt: true,
          createdById: true,
          photos: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      return reply.status(200).send({ destinations })
    },
  )

  // POST /tenants/:slug/destinations — guia cria destino (ADMIN/CONDUTOR)
  app.post(
    '/tenants/:slug/destinations',
    { preHandler: [authenticate, authorize(['ADMIN', 'CONDUTOR'])] },
    async (request, reply) => {
      let input
      try {
        input = CreateDestinationInput.parse(request.body)
      } catch (err) {
        if (err instanceof ZodError) return reply.status(400).send(zodError(err))
        throw err
      }

      const userId = request.user.sub
      const tenantId = request.user.tenantId
      const destination = await createDestination(tenantId, userId, input, request.user.role)
      return reply.status(201).send(destination)
    },
  )

  // PATCH /tenants/:slug/destinations/:id — guia edita destino próprio
  app.patch(
    '/tenants/:slug/destinations/:id',
    { preHandler: [authenticate, authorize(['ADMIN', 'CONDUTOR'])] },
    async (request, reply) => {
      const { slug, id } = request.params as { slug: string; id: string }

      // Verificar que o destino pertence ao tenant indicado pelo slug
      const tenant = await prisma.tenant.findUnique({ where: { slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)
      const linked = await prisma.destination.findFirst({ where: { id, createdBy: { tenant: { slug } } } })
      if (!linked) throw new AppError('Destino não encontrado', 404)

      let input
      try {
        input = UpdateDestinationInput.parse(request.body)
      } catch (err) {
        if (err instanceof ZodError) return reply.status(400).send(zodError(err))
        throw err
      }

      const userId = request.user.sub
      const destination = await updateDestination(id, userId, input)
      return reply.status(200).send(destination)
    },
  )

  // DELETE /tenants/:slug/destinations/:id — guia deleta destino próprio
  app.delete(
    '/tenants/:slug/destinations/:id',
    { preHandler: [authenticate, authorize(['ADMIN', 'CONDUTOR'])] },
    async (request, reply) => {
      const { slug, id } = request.params as { slug: string; id: string }

      // Verificar que o destino pertence ao tenant indicado pelo slug
      const tenant = await prisma.tenant.findUnique({ where: { slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)
      const linked = await prisma.destination.findFirst({ where: { id, createdBy: { tenant: { slug } } } })
      if (!linked) throw new AppError('Destino não encontrado', 404)

      const userId = request.user.sub
      await deleteDestination(id, userId, request.user.role)
      return reply.status(204).send()
    },
  )

  // PATCH /destinations/:id/approve — super-admin aprova ou rejeita destino
  app.patch(
    '/destinations/:id/approve',
    { preHandler: [authenticate, authorize(['ADMIN', 'SUPER_ADMIN'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      let input
      try {
        input = ApprovalUpdateInput.parse(request.body)
      } catch (err) {
        if (err instanceof ZodError) return reply.status(400).send(zodError(err))
        throw err
      }

      const destination =
        input.approvalStatus === 'APPROVED'
          ? await approveDestination(id)
          : await rejectDestination(id, input.rejectionReason)

      return reply.status(200).send(destination)
    },
  )

  // GET /admin/destinations/pending — fila de aprovação (ADMIN)
  app.get(
    '/admin/destinations/pending',
    { preHandler: [authenticate, authorize(['ADMIN', 'SUPER_ADMIN'])] },
    async (request, reply) => {
      const querySchema = z.object({
        limit: z.coerce.number().int().min(1).max(100).default(50),
        offset: z.coerce.number().int().min(0).default(0),
      })

      let query
      try {
        query = querySchema.parse(request.query)
      } catch (err) {
        if (err instanceof ZodError) return reply.status(400).send(zodError(err))
        throw err
      }

      const [destinations, total] = await Promise.all([
        prisma.destination.findMany({
          where: { approvalStatus: 'PENDING' },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
                tenant: { select: { name: true, slug: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
          take: query.limit,
          skip: query.offset,
        }),
        prisma.destination.count({ where: { approvalStatus: 'PENDING' } }),
      ])

      return reply.status(200).send({ destinations, total, limit: query.limit, offset: query.offset })
    },
  )
}
