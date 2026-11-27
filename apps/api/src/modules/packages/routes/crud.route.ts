import { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { authenticate } from '../../../shared/middlewares/authenticate'
import { authorize } from '../../../shared/middlewares/authorize'
import { Role } from '@prisma/client'
import { parseBody, parseParams } from '../../../shared/utils/zod-error'
import {
  canEditPackage,
  canCreatePackageIn,
  isUnverifiedGuide,
  type EditUser,
} from '../../../shared/auth/edit-permissions'
import { isPlatformStaff } from '../../../shared/auth/roles'
import { cancelFutureSlots } from '../../bookings/cancel-future-slots'
import { httpsUrlSchema } from '../../../shared/utils/image-url'
import { GROUP_SIZE_PER_GUIDE } from '../../../shared/utils/money'
import {
  IMPORTANT_FIELDS,
  diffImportant,
  latestRequestsByPackage,
  submitRequest,
} from '../../package-requests/package-requests.service'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

const slugAndIdParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

const photosSchema = z
  .array(httpsUrlSchema('URL de foto inválida'))
  .max(5, { message: 'Máximo 5 fotos permitidas' })

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
  extraGuidePrice: z
    .number()
    .min(0, { message: 'Valor do guia extra não pode ser negativo' })
    .nullable()
    .optional(),
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

const isGuide = (user: EditUser) => user.role === 'CONDUTOR'
const isLive = (pkg: { active: boolean; publishedAt: Date | null }) =>
  pkg.publishedAt !== null && pkg.active

// Guia em roteiro no ar: o pedido vai para a equipe aprovar; nada muda no roteiro agora
async function requestApproval(
  reply: FastifyReply,
  pkgId: string,
  user: EditUser,
  type: 'PUBLISH' | 'UNPUBLISH' | 'ARCHIVE',
) {
  const created = await submitRequest({ packageId: pkgId, requestedById: user.sub, type })
  return reply.status(202).send({
    requestId: created?.id,
    type,
    status: 'PENDING',
    message: 'Enviado para aprovação da equipe',
  })
}

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
  app.get(
    '/tenants/:slug/manage/packages',
    {
      preHandler: [authenticate, authorize(WRITERS)],
    },
    async (request, reply) => {
      const { data: params, error } = parseParams(slugParamsSchema, request.params, reply)
      if (error) return
      const user = request.user as EditUser

      const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)

      const packages = await prisma.tourPackage.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'desc' },
      })

      const editable = packages.filter((p) => canEditPackage(user, p))
      const requests = await latestRequestsByPackage(editable.map((p) => p.id))

      const result = editable.map((p) => ({
        id: p.id,
        tenantSlug: tenant.slug,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        duration: p.duration,
        capacity: p.capacity,
        extraGuidePrice: p.extraGuidePrice === null ? null : Number(p.extraGuidePrice),
        difficulty: p.difficulty,
        photos: p.photos,
        highlights: p.highlights,
        active: p.active,
        publishedAt: p.publishedAt,
        conductorId: p.conductorId,
        status: !p.active ? 'HIDDEN' : p.publishedAt === null ? 'DRAFT' : 'PUBLISHED',
        request: requests.get(p.id) ?? null,
      }))

      return reply.status(200).send({ packages: result })
    },
  )

  app.post(
    '/tenants/:slug/packages',
    {
      preHandler: [authenticate, authorize(WRITERS)],
    },
    async (request, reply) => {
      const { data: params, error } = parseParams(slugParamsSchema, request.params, reply)
      if (error) return

      const { data: body, error: bodyError } = parseBody(
        createPackageBodySchema,
        request.body,
        reply,
      )
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
            capacity: GROUP_SIZE_PER_GUIDE,
            ...(body.extraGuidePrice !== undefined
              ? { extraGuidePrice: body.extraGuidePrice }
              : {}),
            difficulty: body.difficulty,
            ...(body.photos !== undefined ? { photos: body.photos } : {}),
            ...(body.highlights !== undefined ? { highlights: body.highlights } : {}),
            publishedAt: null,
          },
        })

        if (guideProfile) {
          await tx.packageGuide.create({
            data: {
              packageId: pkg.id,
              guideId: guideProfile.id,
              status: 'ACCEPTED',
              decidedAt: new Date(),
            },
          })
        }

        return pkg
      })

      return reply.status(201).send(tourPackage)
    },
  )

  app.put(
    '/tenants/:slug/packages/:id',
    {
      preHandler: [authenticate, authorize(WRITERS)],
    },
    async (request, reply) => {
      const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
      if (error) return

      const { data: body, error: bodyError } = parseBody(
        updatePackageBodySchema,
        request.body,
        reply,
      )
      if (bodyError) return

      const user = request.user as EditUser
      const pkg = await loadEditablePackage(params!.slug, params!.id, user)

      if (isGuide(user) && isLive(pkg)) {
        // Campos importantes viram pedido; os demais valem na hora
        const free: Record<string, unknown> = { ...body }
        for (const field of IMPORTANT_FIELDS) delete free[field]
        const changes: Record<string, { from: unknown; to: unknown }> = diffImportant(pkg, body)

        // Campo já em pedido pendente entra mesmo igual ao atual: é assim que o guia desfaz a mudança
        const pending = await prisma.packageChangeRequest.findFirst({
          where: { packageId: pkg.id, status: 'PENDING', type: 'UPDATE' },
          select: { changes: true },
        })
        const pendingFields = Object.keys((pending?.changes ?? {}) as Record<string, unknown>)
        for (const field of IMPORTANT_FIELDS) {
          if (changes[field] || body[field] === undefined || !pendingFields.includes(field))
            continue
          const current = pkg[field]
          changes[field] = {
            from:
              field === 'price' || field === 'extraGuidePrice'
                ? current === null
                  ? null
                  : Number(current)
                : current,
            to: body[field],
          }
        }

        // Pedido primeiro: se der 409, nada é gravado
        const created =
          Object.keys(changes).length > 0
            ? await submitRequest({
                packageId: pkg.id,
                requestedById: user.sub,
                type: 'UPDATE',
                changes,
              })
            : null
        const updated =
          Object.keys(free).length > 0
            ? await prisma.tourPackage.update({ where: { id: pkg.id }, data: free })
            : pkg

        return reply.status(200).send({
          ...updated,
          pendingRequest: created
            ? { id: created.id, type: created.type, changes: created.changes }
            : null,
        })
      }

      const updated = await prisma.tourPackage.update({
        where: { id: params!.id },
        data: body,
      })

      return reply.status(200).send({ ...updated, pendingRequest: null })
    },
  )

  app.delete(
    '/tenants/:slug/packages/:id',
    {
      preHandler: [authenticate, authorize(WRITERS)],
    },
    async (request, reply) => {
      const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
      if (error) return

      const user = request.user as EditUser
      const pkg = await loadEditablePackage(params!.slug, params!.id, user)

      if (isGuide(user) && isLive(pkg)) return requestApproval(reply, pkg.id, user, 'ARCHIVE')

      // Regra de negócio: arquivar cancela as datas futuras e estorna as reservas.
      // Primeiro o dinheiro: se um estorno falhar, o roteiro não é arquivado.
      const cancelled = await cancelFutureSlots({ packageId: params!.id }, request.log)

      await prisma.tourPackage.update({
        where: { id: params!.id },
        data: { active: false },
      })

      return reply.status(200).send({ message: 'Roteiro inativado', ...cancelled })
    },
  )

  app.patch(
    '/tenants/:slug/packages/:id',
    {
      preHandler: [authenticate, authorize(WRITERS)],
    },
    async (request, reply) => {
      const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
      if (error) return

      const { data: body, error: bodyError } = parseBody(
        patchPackageBodySchema,
        request.body,
        reply,
      )
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
    },
  )

  app.post(
    '/tenants/:slug/packages/:id/publish',
    {
      preHandler: [authenticate, authorize(WRITERS)],
    },
    async (request, reply) => {
      const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
      if (error) return

      const user = request.user as EditUser
      const pkg = await loadEditablePackage(params!.slug, params!.id, user)

      if (pkg.publishedAt) {
        return reply.status(200).send({ id: pkg.id, publishedAt: pkg.publishedAt })
      }
      if (await isUnverifiedGuide(user)) {
        throw new AppError('Guia não aprovado para publicar roteiros', 403)
      }
      if (isGuide(user)) return requestApproval(reply, pkg.id, user, 'PUBLISH')

      const publishedAt = new Date()
      await prisma.tourPackage.update({ where: { id: pkg.id }, data: { publishedAt } })
      return reply.status(200).send({ id: pkg.id, publishedAt })
    },
  )

  app.post(
    '/tenants/:slug/packages/:id/unpublish',
    {
      preHandler: [authenticate, authorize(WRITERS)],
    },
    async (request, reply) => {
      const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
      if (error) return

      const user = request.user as EditUser
      const pkg = await loadEditablePackage(params!.slug, params!.id, user)

      if (isGuide(user) && isLive(pkg)) return requestApproval(reply, pkg.id, user, 'UNPUBLISH')

      // Regra de negócio: despublicar cancela as datas futuras e estorna as reservas
      const cancelled = await cancelFutureSlots({ packageId: pkg.id }, request.log)

      if (pkg.publishedAt) {
        await prisma.tourPackage.update({ where: { id: pkg.id }, data: { publishedAt: null } })
      }
      return reply.status(200).send({ id: pkg.id, publishedAt: null, ...cancelled })
    },
  )

  app.post(
    '/tenants/:slug/packages/:id/restore',
    {
      preHandler: [authenticate, authorize(WRITERS)],
    },
    async (request, reply) => {
      const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
      if (error) return

      const user = request.user as EditUser
      const pkg = await loadEditablePackage(params!.slug, params!.id, user)

      if (isGuide(user)) {
        // Guia volta sempre como rascunho: para ir ao ar, precisa pedir publicação
        if (!pkg.active) {
          await prisma.tourPackage.update({
            where: { id: pkg.id },
            data: { active: true, publishedAt: null },
          })
          return reply.status(200).send({ id: pkg.id, active: true, publishedAt: null })
        }
        return reply.status(200).send({ id: pkg.id, active: true })
      }

      if (!pkg.active) {
        await prisma.tourPackage.update({ where: { id: pkg.id }, data: { active: true } })
      }
      return reply.status(200).send({ id: pkg.id, active: true })
    },
  )
}
