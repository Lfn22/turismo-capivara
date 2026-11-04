import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { parseBody, parseParams } from '../../../shared/utils/zod-error'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { authenticate } from '../../../shared/middlewares/authenticate'
import { authorize } from '../../../shared/middlewares/authorize'
import { BR_STATES } from '../destinations.schemas'
import { geocode, slugify, uniqueSlug } from '../destinations.service'
import { assertNoDestinationLinks, DESTINATION_LINKED_MESSAGE } from '../destinations.links'
import { auditLog } from '../../../shared/audit.js'
import { Sentry } from '../../../shared/sentry'

const paramsSchema = z.object({
  destinationSlug: z.string().min(1, { message: 'Slug obrigatório' }),
})

const createBodySchema = z.object({
  title: z
    .string()
    .min(3, { message: 'Título deve ter entre 3 e 100 caracteres' })
    .max(100, { message: 'Título deve ter entre 3 e 100 caracteres' }),
  subtitle: z.string().nullable().optional(),
  description: z
    .string()
    .min(10, { message: 'Descrição deve ter entre 10 e 5000 caracteres' })
    .max(5000, { message: 'Descrição deve ter entre 10 e 5000 caracteres' }),
  state: z.enum(BR_STATES, { error: 'Estado inválido' }),
  tagline: z.string().nullable().optional(),
  highlights: z.array(z.string().min(1)).max(10, { message: 'Máximo de 10 destaques' }).optional(),
  photos: z.array(z.string().url({ message: 'URL de foto inválida' })).max(5, { message: 'Máximo de 5 fotos' }).optional(),
  heroImageUrl: z.string().url({ message: 'URL de imagem inválida' }).optional(),
})

const deleteBodySchema = z.object({
  confirmName: z.string({ error: 'Informe o nome do destino' }),
})

// Criar, arquivar, restaurar e excluir destino: só a equipe da plataforma
// (authorize(['SUPER_ADMIN']) já admite PLATFORM_ADMIN).
export async function manageDestinationsRoute(app: FastifyInstance) {
  const staffOnly = { preHandler: [authenticate, authorize(['SUPER_ADMIN'])] }

  app.post('/destinations', staffOnly, async (request, reply) => {
    const { data: body, error } = parseBody(createBodySchema, request.body, reply)
    if (error) return

    const baseSlug = slugify(body.title)
    if (!baseSlug) throw new AppError('O título precisa ter letras ou números', 400)
    const slug = await uniqueSlug(baseSlug)
    const coords = await geocode(body.title, body.state)

    const destination = await prisma.destination.create({
      data: {
        slug,
        title: body.title,
        subtitle: body.subtitle ?? null,
        description: body.description,
        state: body.state,
        tagline: body.tagline ?? null,
        highlights: body.highlights ?? [],
        photos: body.photos ?? [],
        heroImageUrl: body.heroImageUrl ?? null,
        approvalStatus: 'APPROVED',
        active: true,
        createdById: request.user.sub,
        ...(coords && { lat: coords.lat, lng: coords.lng }),
      },
    })

    Sentry.setTag('module', 'destinations')
    Sentry.setTag('action', 'create')
    auditLog(prisma, { actorType: 'USER', action: 'destination.created', targetType: 'DESTINATION', targetId: destination.id, ipAddress: request.ip, metadata: { actorUserId: request.user.sub, destinationName: destination.title } })

    return reply.status(201).send(destination)
  })

  for (const [action, active] of [['archive', false], ['restore', true]] as const) {
    app.post(`/destinations/:destinationSlug/${action}`, staffOnly, async (request, reply) => {
      const { data: params, error } = parseParams(paramsSchema, request.params, reply)
      if (error) return

      const destination = await prisma.destination.findUnique({
        where: { slug: params.destinationSlug },
        select: { id: true, slug: true, active: true },
      })
      if (!destination) throw new AppError('Destino não encontrado', 404)

      if (destination.active !== active) {
        await prisma.destination.update({ where: { id: destination.id }, data: { active } })
        Sentry.setTag('module', 'destinations')
        Sentry.setTag('action', action)
        auditLog(prisma, { actorType: 'USER', action: `destination.${action}d`, targetType: 'DESTINATION', targetId: destination.id, ipAddress: request.ip, metadata: { actorUserId: request.user.sub } })
      }

      return reply.status(200).send({ slug: destination.slug, active })
    })
  }

  app.delete('/destinations/:destinationSlug', staffOnly, async (request, reply) => {
    const { data: params, error: paramsError } = parseParams(paramsSchema, request.params, reply)
    if (paramsError) return
    const { data: body, error: bodyError } = parseBody(deleteBodySchema, request.body, reply)
    if (bodyError) return

    const destination = await prisma.destination.findUnique({
      where: { slug: params.destinationSlug },
      select: { id: true, title: true },
    })
    if (!destination) throw new AppError('Destino não encontrado', 404)

    if (body.confirmName.trim().toLowerCase() !== destination.title.trim().toLowerCase()) {
      throw new AppError('O nome não confere', 400)
    }

    await assertNoDestinationLinks(destination.id)

    try {
      await prisma.destination.delete({ where: { id: destination.id } })
    } catch (err) {
      // Vínculo criado entre a checagem e o delete (FK RESTRICT)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new AppError(DESTINATION_LINKED_MESSAGE, 409)
      }
      throw err
    }

    Sentry.setTag('module', 'destinations')
    Sentry.setTag('action', 'delete')
    auditLog(prisma, { actorType: 'USER', action: 'destination.deleted', targetType: 'DESTINATION', targetId: destination.id, ipAddress: request.ip, metadata: { actorUserId: request.user.sub, destinationName: destination.title } })

    return reply.status(204).send()
  })
}
