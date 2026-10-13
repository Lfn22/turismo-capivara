import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { authenticate } from '../../../shared/middlewares/authenticate'
import { authorize } from '../../../shared/middlewares/authorize'
import { Role } from '@prisma/client'
import { parseBody, parseParams, parseQuery } from '../../../shared/utils/zod-error'

const slugAndIdParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

const slugIdAndSlotIdParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
  id: z.string().min(1, { message: 'ID obrigatório' }),
  slotId: z.string().min(1, { message: 'slotId obrigatório' }),
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

const batchSlotBodySchema = z.object({
  startDate: z.string().date('Data inicial inválida'),
  endDate: z.string().date('Data final inválida'),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:MM)'),
  capacity: z.coerce.number().int().positive('Capacidade deve ser positiva'),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1, 'Selecione ao menos um dia da semana'),
})

const blockSlotsBodySchema = z.object({
  dates: z.array(z.string().date('Data inválida')).min(1, 'Informe ao menos uma data').max(90, 'Máximo 90 datas'),
  reason: z.string().optional(),
})

const calendarQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato inválido (YYYY-MM)'),
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

export async function slotsRoute(app: FastifyInstance) {
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

    const { data: body, error: bodyError } = parseBody(updateSlotBodySchema, request.body, reply)
    if (bodyError) return

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

  // POST /tenants/:slug/packages/:id/slots/batch — batch slot creation
  app.post('/tenants/:slug/packages/:id/slots/batch', {
    preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN])],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    const { data: body, error: bodyError } = parseBody(batchSlotBodySchema, request.body, reply)
    if (bodyError) return

    const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    const pkg = await prisma.tourPackage.findFirst({
      where: { id: params!.id, tenantId: tenant.id },
    })
    if (!pkg) throw new AppError('Roteiro não encontrado', 404)

    const user = request.user as { sub: string; role: string }
    if (user.role === 'CONDUTOR' && pkg.conductorId !== user.sub) throw new AppError('Acesso negado', 403)

    const start = new Date(body!.startDate)
    const end = new Date(body!.endDate)
    if (start > end) {
      return reply.status(400).send({ message: 'Data inicial deve ser anterior à data final' })
    }

    const [hours, minutes] = body!.timeOfDay.split(':').map(Number)

    const slots: Array<{
      packageId: string
      startsAt: Date
      capacity: number
      booked: number
      status: 'OPEN'
    }> = []

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (body!.daysOfWeek.includes(d.getDay())) {
        const startsAt = new Date(d)
        startsAt.setHours(hours, minutes, 0, 0)
        slots.push({
          packageId: params!.id,
          startsAt,
          capacity: body!.capacity,
          booked: 0,
          status: 'OPEN',
        })
      }
    }

    if (slots.length === 0) {
      return reply.status(400).send({ message: 'Nenhum slot gerado para o período e dias informados' })
    }

    const created = await prisma.departureSlot.createMany({ data: slots })

    return reply.status(201).send({ created: created.count })
  })

  // PATCH /tenants/:slug/packages/:id/slots/block — block/cancel slots by date
  app.patch('/tenants/:slug/packages/:id/slots/block', {
    preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN])],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    const { data: body, error: bodyError } = parseBody(blockSlotsBodySchema, request.body, reply)
    if (bodyError) return

    const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    const pkg = await prisma.tourPackage.findFirst({
      where: { id: params!.id, tenantId: tenant.id },
    })
    if (!pkg) throw new AppError('Roteiro não encontrado', 404)

    const user = request.user as { sub: string; role: string }
    if (user.role === 'CONDUTOR' && pkg.conductorId !== user.sub) throw new AppError('Acesso negado', 403)

    // Build date ranges for each date
    const dateRanges = body!.dates.map((dateStr) => {
      const dayStart = new Date(dateStr)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dateStr)
      dayEnd.setHours(23, 59, 59, 999)
      return { dayStart, dayEnd, dateStr }
    })

    // Find all OPEN slots in those dates
    const slots = await prisma.departureSlot.findMany({
      where: {
        packageId: params!.id,
        status: 'OPEN',
        OR: dateRanges.map(({ dayStart, dayEnd }) => ({
          startsAt: { gte: dayStart, lte: dayEnd },
        })),
      },
    })

    // Check for slots with bookings
    const datesWithBookings = [
      ...new Set(
        slots
          .filter((s) => s.booked > 0)
          .map((s) => s.startsAt.toISOString().split('T')[0]),
      ),
    ]

    if (datesWithBookings.length > 0) {
      return reply.status(409).send({
        code: 'SLOTS_HAVE_BOOKINGS',
        message: 'Algumas datas possuem reservas e não podem ser bloqueadas',
        datesWithBookings,
      })
    }

    const slotIds = slots.map((s) => s.id)

    if (slotIds.length === 0) {
      return reply.status(200).send({ cancelled: 0 })
    }

    const result = await prisma.departureSlot.updateMany({
      where: { id: { in: slotIds } },
      data: { status: 'CANCELLED' },
    })

    return reply.status(200).send({ cancelled: result.count })
  })

  // GET /tenants/:slug/packages/:id/slots/calendar?month=YYYY-MM
  app.get('/tenants/:slug/packages/:id/slots/calendar', {
    preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN])],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    const { data: query, error: queryError } = parseQuery(calendarQuerySchema, request.query, reply)
    if (queryError) return

    const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
    if (!tenant) throw new AppError('Tenant não encontrado', 404)

    const pkg = await prisma.tourPackage.findFirst({
      where: { id: params!.id, tenantId: tenant.id },
    })
    if (!pkg) throw new AppError('Roteiro não encontrado', 404)

    const [year, month] = query!.month.split('-').map(Number)
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)

    const slots = await prisma.departureSlot.findMany({
      where: {
        packageId: params!.id,
        startsAt: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { startsAt: 'asc' },
    })

    const days: Record<string, Array<{
      id: string
      startsAt: Date
      capacity: number
      booked: number
      status: string
    }>> = {}

    for (const slot of slots) {
      const dateKey = slot.startsAt.toISOString().split('T')[0]
      if (!days[dateKey]) days[dateKey] = []
      days[dateKey].push({
        id: slot.id,
        startsAt: slot.startsAt,
        capacity: slot.capacity,
        booked: slot.booked,
        status: slot.status,
      })
    }

    return { month: query!.month, days }
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
}
