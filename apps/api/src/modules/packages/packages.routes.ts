import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { Role } from '@prisma/client'
import { updatePackagePhotos, updatePackageHighlights } from './packages.service'

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

const slugAndIdParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

function parseParams<T>(schema: z.ZodType<T>, params: unknown, reply: any): { data: T; error: null } | { data: null; error: true } {
  try {
    return { data: schema.parse(params) as T, error: null }
  } catch (err) {
    if (err instanceof ZodError) {
      reply.status(400).send({
        message: 'Dados inválidos',
        errors: err.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      })
      return { data: null, error: true }
    }
    throw err
  }
}

const createPackageBodySchema = z.object({
  name: z.string().min(1, { message: 'Nome obrigatório' }),
  description: z.string().min(1, { message: 'Descrição obrigatória' }),
  duration: z.number().int().positive({ message: 'Duração deve ser inteiro positivo' }),
  price: z.number().positive({ message: 'Preço deve ser positivo' }),
  capacity: z.number().int().positive({ message: 'Capacidade deve ser inteiro positivo' }),
  difficulty: z.enum(['EASY', 'MODERATE', 'HARD'], { message: 'Dificuldade inválida' }),
})

const updatePackageBodySchema = createPackageBodySchema.partial()

const slugIdAndSlotIdParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
  id: z.string().min(1, { message: 'ID obrigatório' }),
  slotId: z.string().min(1, { message: 'slotId obrigatório' }),
})

const packageIdParamsSchema = z.object({
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

class ScheduleConflictError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'ScheduleConflictError'
  }
}

const createSlotBodySchema = z.object({
  startsAt: z
    .string()
    .datetime({ message: 'Data inválida' })
    .refine((val) => new Date(val) > new Date(), {
      message: 'A data do slot deve ser no futuro',
    }),
  capacity: z.number().int().min(1, { message: 'Capacidade mínima é 1' }),
  minCapacity: z.number().int().min(1, { message: 'Mínimo de participantes é 1' }),
  guideId: z.string().min(1, { message: 'guideId obrigatório' }),
}).refine((d) => d.minCapacity <= d.capacity, {
  message: 'Mínimo não pode exceder capacidade máxima',
  path: ['minCapacity'],
})

const updateSlotBodySchema = z.object({
  startsAt: z.string().datetime({ message: 'Data inválida' }).optional(),
  capacity: z.number().int().min(1, { message: 'Capacidade mínima é 1' }).optional(),
  minCapacity: z.number().int().min(1, { message: 'Mínimo de participantes é 1' }).optional(),
}).refine(
  (d) => {
    if (d.minCapacity !== undefined && d.capacity !== undefined) return d.minCapacity <= d.capacity
    return true
  },
  { message: 'Mínimo não pode exceder capacidade máxima', path: ['minCapacity'] },
)

export async function packagesRoutes(app: FastifyInstance) {
  app.get('/tenants/:slug/packages', async (request, reply) => {
    const { data: params, error } = parseParams(slugParamsSchema, request.params, reply)
    if (error) return

    const tenant = await prisma.tenant.findUnique({
      where: { slug: params!.slug },
    })

    if (!tenant) {
      throw new AppError('Tenant não encontrado', 404)
    }

    const query = request.query as { conductorId?: string }
    const conductorId = query.conductorId ?? undefined

    const packages = await prisma.tourPackage.findMany({
      where: {
        tenantId: tenant.id,
        active: true,
        ...(conductorId ? { conductorId } : {}),
      },
      include: {
        departureSlots: {
          where: {
            startsAt: { gte: new Date() },
            status: 'OPEN',
          },
          orderBy: { startsAt: 'asc' },
          take: 5,
        },
      },
    })

    const packagesWithMinReached = packages.map((pkg) => ({
      ...pkg,
      departureSlots: pkg.departureSlots.map((slot) => ({
        ...slot,
        hasMinimumReached: slot.booked >= slot.minCapacity,
      })),
    }))
    return packagesWithMinReached
  })

  app.get('/tenants/:slug/packages/:id', async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    const tenant = await prisma.tenant.findUnique({
      where: { slug: params!.slug },
    })

    if (!tenant) {
      throw new AppError('Tenant não encontrado', 404)
    }

    const tourPackage = await prisma.tourPackage.findFirst({
      where: {
        id: params!.id,
        tenantId: tenant.id,
      },
      include: {
        departureSlots: {
          where: {
            startsAt: { gte: new Date() },
            status: 'OPEN',
          },
          orderBy: { startsAt: 'asc' },
        },
      },
    })

    if (!tourPackage) {
      throw new AppError('Roteiro não encontrado', 404)
    }

    const packageWithMinReached = {
      ...tourPackage,
      departureSlots: tourPackage.departureSlots.map((slot) => ({
        ...slot,
        hasMinimumReached: slot.booked >= slot.minCapacity,
      })),
    }
    return packageWithMinReached
  })

  // GET /packages/:id/guides — guias qualificados de um pacote (público)
  app.get('/packages/:id/guides', async (request, reply) => {
    const { data: params, error } = parseParams(packageIdParamsSchema, request.params, reply)
    if (error) return

    const guides = await prisma.packageGuide.findMany({
      where: {
        packageId: params!.id,
        active: true,
      },
      include: {
        guide: {
          select: {
            id: true,
            bio: true,
            photoUrl: true,
            especialidades: true,
            regioes: true,
            user: {
              select: { name: true },
            },
          },
        },
      },
    })

    return reply.status(200).send(
      guides.map((pg) => ({
        guideId: pg.guide.id,
        name: pg.guide.user.name,
        bio: pg.guide.bio,
        photoUrl: pg.guide.photoUrl,
        especialidades: pg.guide.especialidades,
        regioes: pg.guide.regioes,
      }))
    )
  })

  app.post('/tenants/:slug/packages', {
    preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN])],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugParamsSchema, request.params, reply)
    if (error) return

    let body
    try {
      body = createPackageBodySchema.parse(request.body)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send({
        message: 'Dados inválidos',
        errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
      })
      throw err
    }

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

  // POST /tenants/:slug/packages/:id/guides/me — condutor se vincula ao próprio roteiro
  app.post('/tenants/:slug/packages/:id/guides/me', {
    preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN])],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    const user = request.user as { sub: string; role: string }

    const guideProfile = await prisma.guideProfile.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    })
    if (!guideProfile) throw new AppError('Perfil de guia não encontrado', 404)

    const pkg = await prisma.tourPackage.findFirst({
      where: { id: params!.id, tenantId: { not: undefined } },
      select: { id: true },
    })
    if (!pkg) throw new AppError('Roteiro não encontrado', 404)

    await prisma.packageGuide.upsert({
      where: { packageId_guideId: { packageId: params!.id, guideId: guideProfile.id } },
      create: { packageId: params!.id, guideId: guideProfile.id, active: true },
      update: { active: true },
    })

    return reply.status(200).send({ message: 'Guia vinculado ao roteiro com sucesso' })
  })

  app.put('/tenants/:slug/packages/:id', {
    preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN])],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    let body
    try {
      body = updatePackageBodySchema.parse(request.body)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send({
        message: 'Dados inválidos',
        errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
      })
      throw err
    }

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

  app.get('/tenants/:slug/packages/:id/slots', async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    const tenant = await prisma.tenant.findUnique({
      where: { slug: params!.slug },
    })

    if (!tenant) {
      throw new AppError('Tenant não encontrado', 404)
    }

    const tourPackage = await prisma.tourPackage.findFirst({
      where: { id: params!.id, tenantId: tenant.id, active: true },
    })

    if (!tourPackage) {
      throw new AppError('Roteiro não encontrado', 404)
    }

    const slots = await prisma.departureSlot.findMany({
      where: {
        packageId: params!.id,
        status: 'OPEN',
        startsAt: { gte: new Date() },
      },
      orderBy: { startsAt: 'asc' },
    })

    return slots.map((slot) => ({
      ...slot,
      hasMinimumReached: slot.booked >= slot.minCapacity,
    }))
  })

  app.post('/tenants/:slug/packages/:id/slots', {
    preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN])],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    let body
    try {
      body = createSlotBodySchema.parse(request.body)
    } catch (err) {
      if (err instanceof ZodError) {
        const pastDateIssue = err.issues.find((e) => e.message === 'A data do slot deve ser no futuro')
        if (pastDateIssue) {
          return reply.status(400).send({
            code: 'SLOT_DATE_PAST',
            message: 'A data do slot deve ser no futuro',
          })
        }
        return reply.status(400).send({
          message: 'Dados inválidos',
          errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
        })
      }
      throw err
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    const pkg = await prisma.tourPackage.findFirst({
      where: { id: params!.id, tenantId: tenant.id },
    })
    if (!pkg) throw new AppError('Roteiro não encontrado', 404)

    const user = request.user as { sub: string; role: string }
    if (user.role === 'CONDUTOR' && pkg.conductorId !== user.sub) throw new AppError('Acesso negado', 403)
    if (user.role === 'CONDUTOR') {
      const conductor = await prisma.user.findUnique({ where: { id: user.sub }, select: { approvalStatus: true } })
      if (conductor?.approvalStatus !== 'APPROVED') throw new AppError('Guia não aprovado para criar slots', 403)
    }

    // CR-004: Validate guideId belongs to the same tenant (cross-tenant isolation)
    const guideOwner = await prisma.guideProfile.findUnique({
      where: { id: body!.guideId },
      select: { user: { select: { tenantId: true } } },
    })
    if (!guideOwner || guideOwner.user.tenantId !== tenant.id) {
      throw new AppError('Guia não pertence a este tenant', 403)
    }

    // Calcular janela do novo slot
    const newStart = new Date(body!.startsAt)
    const newSlotEndMs = newStart.getTime() + ((pkg.durationMaxHours ?? 0) * 60 + pkg.bufferMinutes) * 60_000

    // Transação: conflict check + create
    let slot
    try {
      slot = await prisma.$transaction(async (tx) => {
        const existingSlots = await tx.departureSlot.findMany({
          where: {
            guideId: body!.guideId,
            status: { in: ['OPEN', 'FULL'] },
            startsAt: { lt: new Date(newSlotEndMs) },
          },
          select: {
            startsAt: true,
            package: {
              select: { durationMaxHours: true, bufferMinutes: true, name: true },
            },
          },
        })

        for (const existing of existingSlots) {
          const existingStart = existing.startsAt.getTime()
          const existingEndMs =
            existingStart +
            ((existing.package.durationMaxHours ?? 0) * 60 + existing.package.bufferMinutes) * 60 * 1000

          if (newStart.getTime() < existingEndMs && newSlotEndMs > existingStart) {
            const existingEndDate = new Date(existingEndMs)
            const fmt = (d: Date) =>
              d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })

            const guideProfile = await tx.guideProfile.findUnique({
              where: { id: body!.guideId },
              select: { user: { select: { name: true } } },
            })
            const guideName = guideProfile?.user.name ?? 'Guia'

            throw new ScheduleConflictError(
              'GUIDE_SCHEDULE_CONFLICT',
              409,
              `Guia ${guideName} já tem compromisso com roteiro '${existing.package.name}' das ${fmt(existing.startsAt)} até ${fmt(existingEndDate)}`,
            )
          }
        }

        return await tx.departureSlot.create({
          data: {
            packageId: pkg.id,
            guideId: body!.guideId,
            startsAt: new Date(body!.startsAt),
            capacity: body!.capacity,
            minCapacity: body!.minCapacity,
          },
        })
      })
    } catch (err) {
      if (err instanceof ScheduleConflictError) {
        return reply.status(err.statusCode).send({ code: err.code, message: err.message })
      }
      throw err
    }

    return reply.status(201).send(slot)
  })

  app.patch('/tenants/:slug/packages/:id/slots/:slotId', {
    preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN])],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugIdAndSlotIdParamsSchema, request.params, reply)
    if (error) return

    let body
    try {
      body = updateSlotBodySchema.parse(request.body)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send({
        message: 'Dados inválidos',
        errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
      })
      throw err
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    const slot = await prisma.departureSlot.findFirst({
      where: { id: params!.slotId, package: { tenantId: tenant.id } },
      include: { package: { select: { conductorId: true, id: true } } },
    })
    if (!slot) throw new AppError('Slot não encontrado', 404)
    if (slot.package.id !== params!.id) throw new AppError('Slot não encontrado', 404)

    const user = request.user as { sub: string; role: string }
    if (user.role === 'CONDUTOR' && slot.package.conductorId !== user.sub) throw new AppError('Acesso negado', 403)

    const updateData: Record<string, unknown> = {}
    if (body!.startsAt !== undefined) updateData.startsAt = new Date(body!.startsAt)
    if (body!.capacity !== undefined) updateData.capacity = body!.capacity
    if (body!.minCapacity !== undefined) updateData.minCapacity = body!.minCapacity

    const updated = await prisma.departureSlot.update({
      where: { id: params!.slotId },
      data: updateData,
    })

    return reply.status(200).send(updated)
  })

  app.delete('/tenants/:slug/packages/:id/slots/:slotId', {
    preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN])],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugIdAndSlotIdParamsSchema, request.params, reply)
    if (error) return

    const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    const user = request.user as { sub: string; role: string }

    const result = await prisma.$transaction(async (tx) => {
      const slot = await tx.departureSlot.findFirst({
        where: { id: params!.slotId, package: { tenantId: tenant.id } },
        include: { package: { select: { conductorId: true, id: true } } },
      })
      if (!slot) throw new AppError('Slot não encontrado', 404)
      if (slot.package.id !== params!.id) throw new AppError('Slot não encontrado', 404)
      if (user.role === 'CONDUTOR' && slot.package.conductorId !== user.sub) throw new AppError('Acesso negado', 403)
      if (slot.status === 'CANCELLED') throw new AppError('Slot já cancelado', 400)

      await tx.departureSlot.update({
        where: { id: params!.slotId },
        data: { status: 'CANCELLED' },
      })

      const { count } = await tx.booking.updateMany({
        where: { slotId: params!.slotId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      })

      return { message: 'Slot cancelado', bookingsCancelled: count }
    })

    return reply.status(200).send(result)
  })

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

  app.patch('/tenants/:slug/packages/:id', {
    preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN])],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    let body
    try {
      body = patchPackageBodySchema.parse(request.body)
    } catch (err) {
      if (err instanceof ZodError) return reply.status(400).send({
        message: 'Dados inválidos',
        errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
      })
      throw err
    }

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
