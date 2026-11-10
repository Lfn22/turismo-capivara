import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { authenticate } from '../../../shared/middlewares/authenticate'
import { authorize } from '../../../shared/middlewares/authorize'
import { Role } from '@prisma/client'
import { parseBody, parseParams } from '../../../shared/utils/zod-error'
import { canEditPackage, canCreatePackageIn, isUnverifiedGuide, type EditUser } from '../../../shared/auth/edit-permissions'
import { isPlatformStaff } from '../../../shared/auth/roles'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

const slugAndIdParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

const photosSchema = z.array(z.string().url({ message: 'URL de foto inválida' })).max(5, { message: 'Máximo 5 fotos permitidas' })

const highlightsSchema = z
  .array(
    z
      .string()
      .min(5, { message: 'Destaque deve ter pelo menos 5 caracteres' })
      .max(200, { message: 'Destaque deve ter no máximo 200 caracteres' }),
  )
  .max(10, { message: 'Máximo 10 destaques permitidos' })

const createPackageBodySchema = z.object({
  name: z.string().min(1, { message: 'Nome obrigatório' }),
  description: z.string().min(1, { message: 'Descrição obrigatória' }),
  duration: z.number().int().positive({ message: 'Duração deve ser inteiro positivo' }),
  price: z.number().positive({ message: 'Preço deve ser positivo' }),
  capacity: z.number().int().positive({ message: 'Capacidade deve ser inteiro positivo' }),
  difficulty: z.enum(['EASY', 'MODERATE', 'HARD'], { message: 'Dificuldade inválida' }),
  photos: photosSchema.optional(),
  highlights: highlightsSchema.optional(),
})

const updatePackageBodySchema = createPackageBodySchema.partial()

const patchPackageBodySchema = z
  .object({
    photos: photosSchema.optional(),
    highlights: highlightsSchema.optional(),
  })
  .refine((data) => data.photos !== undefined || data.highlights !== undefined, {
    message: 'Pelo menos um campo deve ser informado',
  })

const WRITERS = [Role.CONDUTOR, Role.ADMIN, Role.SUPER_ADMIN]

// Carrega o roteiro do tenant da URL e exige que o usuário possa editá-lo
async function loadEditablePackage(slug: string, id: string, user: EditUser) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant) throw new AppError('Tenant não encontrado', 404)

  const pkg = await prisma.tourPackage.findFirst({ where: { id, tenantId: tenant.id } })
  if (!pkg) throw new AppError('Roteiro não encontrado', 404)

  if (!canEditPackage(user, pkg)) throw new AppError('Acesso negado', 403)
  return pkg
}

export async function crudPackagesRoute(app: FastifyInstance) {
  // Lista do painel: todos os roteiros do tenant que o usuário pode editar, inclusive rascunho e oculto.
  app.get('/tenants/:slug/manage/packages', {
    preHandler: [authenticate, authorize(WRITERS)],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugParamsSchema, request.params, reply)
    if (error) return
    const user = request.user as EditUser

    const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    const packages = await prisma.tourPackage.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
    })

    const result = packages
      .filter((p) => canEditPackage(user, p))
      .map((p) => ({
        id: p.id,
        tenantSlug: tenant.slug,
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
        conductorId: p.conductorId,
        status: !p.active ? 'HIDDEN' : p.publishedAt === null ? 'DRAFT' : 'PUBLISHED',
      }))

    return reply.status(200).send({ packages: result })
  })

  app.post('/tenants/:slug/packages', {
    preHandler: [authenticate, authorize(WRITERS)],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugParamsSchema, request.params, reply)
    if (error) return

    const { data: body, error: bodyError } = parseBody(createPackageBodySchema, request.body, reply)
    if (bodyError) return

    const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    const user = request.user as EditUser
    if (!canCreatePackageIn(user, tenant.id)) throw new AppError('Acesso negado', 403)

    // Equipe cria em nome da agência: sem condutor e sem vínculo de guia
    const byStaff = isPlatformStaff(user.role)
    const guideProfile = byStaff
      ? null
      : await prisma.guideProfile.findUnique({
          where: { userId: user.sub },
          select: { id: true },
        })

    const tourPackage = await prisma.$transaction(async (tx) => {
      const pkg = await tx.tourPackage.create({
        data: {
          tenantId: tenant.id,
          conductorId: byStaff ? null : user.sub,
          name: body.name,
          description: body.description,
          duration: body.duration,
          price: body.price,
          capacity: body.capacity,
          difficulty: body.difficulty,
          ...(body.photos !== undefined ? { photos: body.photos } : {}),
          ...(body.highlights !== undefined ? { highlights: body.highlights } : {}),
          publishedAt: null,
        },
      })

      if (guideProfile) {
        await tx.packageGuide.create({
          data: { packageId: pkg.id, guideId: guideProfile.id, status: 'ACCEPTED', decidedAt: new Date() },
        })
      }

      return pkg
    })

    return reply.status(201).send(tourPackage)
  })

  app.put('/tenants/:slug/packages/:id', {
    preHandler: [authenticate, authorize(WRITERS)],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    const { data: body, error: bodyError } = parseBody(updatePackageBodySchema, request.body, reply)
    if (bodyError) return

    await loadEditablePackage(params!.slug, params!.id, request.user as EditUser)

    const updated = await prisma.tourPackage.update({
      where: { id: params!.id },
      data: body,
    })

    return reply.status(200).send(updated)
  })

  app.delete('/tenants/:slug/packages/:id', {
    preHandler: [authenticate, authorize(WRITERS)],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    await loadEditablePackage(params!.slug, params!.id, request.user as EditUser)

    await prisma.tourPackage.update({
      where: { id: params!.id },
      data: { active: false },
    })

    return reply.status(200).send({ message: 'Roteiro inativado' })
  })

  app.patch('/tenants/:slug/packages/:id', {
    preHandler: [authenticate, authorize(WRITERS)],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    const { data: body, error: bodyError } = parseBody(patchPackageBodySchema, request.body, reply)
    if (bodyError) return

    await loadEditablePackage(params!.slug, params!.id, request.user as EditUser)

    const updatedPackage = await prisma.tourPackage.update({
      where: { id: params!.id },
      data: {
        ...(body.photos !== undefined ? { photos: body.photos } : {}),
        ...(body.highlights !== undefined ? { highlights: body.highlights } : {}),
      },
    })

    return reply.status(200).send(updatedPackage)
  })

  app.post('/tenants/:slug/packages/:id/publish', {
    preHandler: [authenticate, authorize(WRITERS)],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    const pkg = await loadEditablePackage(params!.slug, params!.id, request.user as EditUser)

    if (pkg.publishedAt) {
      return reply.status(200).send({ id: pkg.id, publishedAt: pkg.publishedAt })
    }
    if (await isUnverifiedGuide(request.user as EditUser)) {
      throw new AppError('Guia não aprovado para publicar roteiros', 403)
    }

    const publishedAt = new Date()
    await prisma.tourPackage.update({ where: { id: pkg.id }, data: { publishedAt } })
    return reply.status(200).send({ id: pkg.id, publishedAt })
  })

  app.post('/tenants/:slug/packages/:id/unpublish', {
    preHandler: [authenticate, authorize(WRITERS)],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    const pkg = await loadEditablePackage(params!.slug, params!.id, request.user as EditUser)

    if (pkg.publishedAt) {
      await prisma.tourPackage.update({ where: { id: pkg.id }, data: { publishedAt: null } })
    }
    return reply.status(200).send({ id: pkg.id, publishedAt: null })
  })

  app.post('/tenants/:slug/packages/:id/restore', {
    preHandler: [authenticate, authorize(WRITERS)],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    const pkg = await loadEditablePackage(params!.slug, params!.id, request.user as EditUser)

    if (!pkg.active) {
      if (pkg.publishedAt && (await isUnverifiedGuide(request.user as EditUser))) {
        throw new AppError('Guia não aprovado para publicar roteiros', 403)
      }
      await prisma.tourPackage.update({ where: { id: pkg.id }, data: { active: true } })
    }
    return reply.status(200).send({ id: pkg.id, active: true })
  })
}
