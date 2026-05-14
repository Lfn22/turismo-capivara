import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'

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
}
