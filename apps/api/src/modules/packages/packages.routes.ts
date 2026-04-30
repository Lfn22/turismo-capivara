import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { Role } from '@prisma/client'

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

const createSlotBodySchema = z.object({
  startsAt: z.string().datetime({ message: 'Data inválida' }),
  capacity: z.number().int().min(1, { message: 'Capacidade mínima é 1' }),
  minCapacity: z.number().int().min(1, { message: 'Mínimo de participantes é 1' }),
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

    const packages = await prisma.tourPackage.findMany({
      where: {
        tenantId: tenant.id,
        active: true,
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

    const tourPackage = await prisma.tourPackage.create({
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

    return reply.status(201).send(tourPackage)
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

  app.post('/tenants/:slug/packages/:id/slots', {
    preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN])],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    let body
    try {
      body = createSlotBodySchema.parse(request.body)
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
    if (user.role === 'CONDUTOR' && pkg.conductorId !== user.sub) throw new AppError('Acesso negado', 403)

    const slot = await prisma.departureSlot.create({
      data: {
        packageId: pkg.id,
        startsAt: new Date(body!.startsAt),
        capacity: body!.capacity,
        minCapacity: body!.minCapacity,
      },
    })

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
}
