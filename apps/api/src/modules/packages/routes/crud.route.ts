import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { authenticate } from '../../../shared/middlewares/authenticate'
import { authorize } from '../../../shared/middlewares/authorize'
import { Role } from '@prisma/client'
import { updatePackagePhotos, updatePackageHighlights } from '../packages.service'
import { parseBody, parseParams } from '../../../shared/utils/zod-error'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

const slugAndIdParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

const createPackageBodySchema = z.object({
  name: z.string().min(1, { message: 'Nome obrigatório' }),
  description: z.string().min(1, { message: 'Descrição obrigatória' }),
  duration: z.number().int().positive({ message: 'Duração deve ser inteiro positivo' }),
  price: z.number().positive({ message: 'Preço deve ser positivo' }),
  capacity: z.number().int().positive({ message: 'Capacidade deve ser inteiro positivo' }),
  difficulty: z.enum(['EASY', 'MODERATE', 'HARD'], { message: 'Dificuldade inválida' }),
})

const updatePackageBodySchema = createPackageBodySchema.partial()

const patchPackageBodySchema = z
  .object({
    photos: z.array(z.string().url({ message: 'URL de foto inválida' })).max(5, { message: 'Máximo 5 fotos permitidas' }).optional(),
    highlights: z
      .array(
        z
          .string()
          .min(5, { message: 'Destaque deve ter pelo menos 5 caracteres' })
          .max(200, { message: 'Destaque deve ter no máximo 200 caracteres' }),
      )
      .max(10, { message: 'Máximo 10 destaques permitidos' })
      .optional(),
  })
  .refine((data) => data.photos !== undefined || data.highlights !== undefined, {
    message: 'Pelo menos um campo deve ser informado',
  })

export async function crudPackagesRoute(app: FastifyInstance) {
  app.post('/tenants/:slug/packages', {
    preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN])],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugParamsSchema, request.params, reply)
    if (error) return

    const { data: body, error: bodyError } = parseBody(createPackageBodySchema, request.body, reply)
    if (bodyError) return

    const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    const user = request.user as { sub: string; role: string }

    const guideProfile = await prisma.guideProfile.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    })

    const tourPackage = await prisma.$transaction(async (tx) => {
      const pkg = await tx.tourPackage.create({
        data: {
          tenantId: tenant.id,
          conductorId: user.sub,
          name: body.name,
          description: body.description,
          duration: body.duration,
          price: body.price,
          capacity: body.capacity,
          difficulty: body.difficulty,
        },
      })

      if (guideProfile) {
        await tx.packageGuide.create({
          data: { packageId: pkg.id, guideId: guideProfile.id, active: true },
        })
      }

      return pkg
    })

    return reply.status(201).send(tourPackage)
  })

  app.put('/tenants/:slug/packages/:id', {
    preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN])],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    const { data: body, error: bodyError } = parseBody(updatePackageBodySchema, request.body, reply)
    if (bodyError) return

    const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    const pkg = await prisma.tourPackage.findFirst({
      where: { id: params!.id, tenantId: tenant.id },
    })
    if (!pkg) throw new AppError('Roteiro não encontrado', 404)

    const user = request.user as { sub: string; role: string }
    if (user.role === 'CONDUTOR' && pkg.conductorId !== user.sub) {
      throw new AppError('Acesso negado', 403)
    }

    const updated = await prisma.tourPackage.update({
      where: { id: params!.id },
      data: body,
    })

    return reply.status(200).send(updated)
  })

  app.delete('/tenants/:slug/packages/:id', {
    preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN])],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    const pkg = await prisma.tourPackage.findFirst({
      where: { id: params!.id, tenantId: tenant.id },
    })
    if (!pkg) throw new AppError('Roteiro não encontrado', 404)

    const user = request.user as { sub: string; role: string }
    if (user.role === 'CONDUTOR' && pkg.conductorId !== user.sub) {
      throw new AppError('Acesso negado', 403)
    }

    await prisma.tourPackage.update({
      where: { id: params!.id },
      data: { active: false },
    })

    return reply.status(200).send({ message: 'Roteiro inativado' })
  })

  app.patch('/tenants/:slug/packages/:id', {
    preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN])],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    const { data: body, error: bodyError } = parseBody(patchPackageBodySchema, request.body, reply)
    if (bodyError) return

    const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    const user = request.user as { sub: string; role: string }

    if (body.photos !== undefined) {
      await updatePackagePhotos(params!.id, user.sub, body.photos, user.role)
    }

    if (body.highlights !== undefined) {
      await updatePackageHighlights(params!.id, user.sub, body.highlights, user.role)
    }

    // Busca o pacote completo após todas as atualizações para retornar estado consistente
    const updatedPackage = await prisma.tourPackage.findUnique({ where: { id: params!.id } })

    return reply.status(200).send(updatedPackage)
  })
}
