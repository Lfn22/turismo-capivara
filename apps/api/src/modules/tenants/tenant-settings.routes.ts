import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { isPlatformStaff } from '../../shared/auth/roles'
import { auditLog } from '../../shared/audit'
import { parseBody, parseParams } from '../../shared/utils/zod-error'
import { imageUrlSchema } from '../../shared/utils/image-url'
import { deleteReplacedPhoto } from '../uploads/replaced-photo'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

const tenantIdParamsSchema = z.object({
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

// Telefone brasileiro com DDD (opcionalmente +55): só dígitos, espaços, parênteses, + e -
const whatsappSchema = z
  .string()
  .trim()
  .regex(/^[\d\s()+-]+$/, { message: 'WhatsApp inválido' })
  .refine((v) => {
    const digits = v.replace(/\D/g, '').length
    return digits >= 10 && digits <= 13
  }, { message: 'WhatsApp inválido' })

const settingsBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
    .max(120, { message: 'Nome deve ter no máximo 120 caracteres' })
    .optional(),
  whatsapp: whatsappSchema.nullable().optional(),
  logoUrl: imageUrlSchema.nullable().optional(),
})

const settingsSelect = { id: true, slug: true, name: true, whatsapp: true, logoUrl: true, type: true } as const

type SettingsBody = z.infer<typeof settingsBodySchema>

function toUpdateData(body: SettingsBody) {
  return {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.whatsapp !== undefined && { whatsapp: body.whatsapp }),
    ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
  }
}

export async function tenantSettingsRoutes(app: FastifyInstance) {
  // ADMIN do próprio tenant ou equipe da plataforma (authenticate já barra tenant alheio via :slug)
  const ownerOrStaff = [authenticate, authorize(['ADMIN', 'SUPER_ADMIN'])]

  async function loadBySlug(slug: string, user: { role: string; tenantId: string }) {
    const tenant = await prisma.tenant.findUnique({ where: { slug }, select: settingsSelect })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)
    if (!isPlatformStaff(user.role) && user.tenantId !== tenant.id) {
      throw new AppError('Acesso negado a este tenant', 403)
    }
    return tenant
  }

  app.get('/tenants/:slug/settings', { preHandler: ownerOrStaff }, async (request, reply) => {
    const { data: params, error } = parseParams(slugParamsSchema, request.params, reply)
    if (error) return
    const tenant = await loadBySlug(params.slug, request.user)
    return reply.send(tenant)
  })

  app.patch('/tenants/:slug/settings', { preHandler: ownerOrStaff }, async (request, reply) => {
    const { data: params, error: paramsError } = parseParams(slugParamsSchema, request.params, reply)
    if (paramsError) return
    const { data: body, error: bodyError } = parseBody(settingsBodySchema, request.body, reply)
    if (bodyError) return

    const tenant = await loadBySlug(params.slug, request.user)
    const data = toUpdateData(body)
    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data,
      select: settingsSelect,
    })

    if (body.logoUrl !== undefined) {
      await deleteReplacedPhoto(tenant.logoUrl, body.logoUrl, request.log)
    }

    auditLog(prisma, {
      actorType: 'USER',
      action: 'tenant.updated',
      targetType: 'TENANT',
      targetId: updated.id,
      ipAddress: request.ip,
      metadata: { actorUserId: request.user.sub, fields: Object.keys(data).join(',') },
    })

    return reply.send(updated)
  })

  // Equipe da plataforma edita qualquer operadora pelo id
  app.patch('/tenants/:id/admin-settings', {
    preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
  }, async (request, reply) => {
    const { data: params, error: paramsError } = parseParams(tenantIdParamsSchema, request.params, reply)
    if (paramsError) return
    const { data: body, error: bodyError } = parseBody(settingsBodySchema, request.body, reply)
    if (bodyError) return

    const existing = await prisma.tenant.findUnique({ where: { id: params.id }, select: { id: true, logoUrl: true } })
    if (!existing) throw new AppError('Operadora não encontrada', 404)

    const data = toUpdateData(body)
    const updated = await prisma.tenant.update({ where: { id: params.id }, data, select: settingsSelect })

    if (body.logoUrl !== undefined) {
      await deleteReplacedPhoto(existing.logoUrl, body.logoUrl, request.log)
    }

    auditLog(prisma, {
      actorType: 'USER',
      action: 'tenant.updated',
      targetType: 'TENANT',
      targetId: updated.id,
      ipAddress: request.ip,
      metadata: { actorUserId: request.user.sub, fields: Object.keys(data).join(',') },
    })

    return reply.send(updated)
  })
}
