import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'

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
  // GET /destinations — lista destinos ativos (público)
  app.get('/destinations', async (_request, reply) => {
    const destinations = await prisma.destination.findMany({
      where: { active: true },
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
      orderBy: { title: 'asc' },
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
      },
    })

    if (!destination) throw new AppError('Destino não encontrado', 404)

    return reply.status(200).send(destination)
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
      })),
    })
  })

  // PATCH /destinations/:destinationSlug — atualiza fotos (ADMIN/SUPER_ADMIN)
  app.patch(
    '/destinations/:destinationSlug',
    { preHandler: [authenticate, authorize(['ADMIN', 'SUPER_ADMIN'])] },
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

      const bodySchema = z.object({
        heroImageUrl: z.string().url().nullable().optional(),
        photos: z.array(z.string().url()).max(5).optional(),
        title: z.string().min(1).optional(),
        subtitle: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
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
}
