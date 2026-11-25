import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { BOOKING_CUTOFF_HOURS } from '../../bookings/booking-cutoff'
import { cancelBooking } from '../../bookings/cancel-booking'
import {
  assertGuideAssignable,
  assertGuideFree,
  eachDate,
  ScheduleConflictError,
  tourDateKey,
  tourDateTime,
  tourDayRange,
  weekdayOf,
} from '../slot-rules'
import { authenticate } from '../../../shared/middlewares/authenticate'
import { authorize } from '../../../shared/middlewares/authorize'
import { Role, type Prisma } from '@prisma/client'
import { parseBody, parseParams, parseQuery } from '../../../shared/utils/zod-error'
import {
  canEditPackage,
  isUnverifiedGuide,
  type EditUser,
} from '../../../shared/auth/edit-permissions'

const slugAndIdParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

const slugIdAndSlotIdParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
  id: z.string().min(1, { message: 'ID obrigatório' }),
  slotId: z.string().min(1, { message: 'slotId obrigatório' }),
})

const createSlotBodySchema = z
  .object({
    startsAt: z
      .string()
      .datetime({ message: 'Data inválida' })
      .refine((val) => new Date(val) > new Date(), {
        message: 'A data do slot deve ser no futuro',
      }),
    capacity: z.number().int().min(1, { message: 'Capacidade mínima é 1' }),
    minCapacity: z.number().int().min(1, { message: 'Mínimo de participantes é 1' }),
    guideId: z.string().min(1, { message: 'guideId obrigatório' }),
  })
  .refine((d) => d.minCapacity <= d.capacity, {
    message: 'Mínimo não pode exceder capacidade máxima',
    path: ['minCapacity'],
  })

const batchSlotBodySchema = z.object({
  startDate: z
    .string()
    .date('Data inicial inválida')
    .refine((d) => new Date(d) >= new Date(new Date().toDateString()), {
      message: 'Data de início deve ser no futuro',
    }),
  endDate: z.string().date('Data final inválida'),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:MM)'),
  capacity: z.coerce.number().int().positive('Capacidade deve ser positiva'),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1, 'Selecione ao menos um dia da semana'),
  guideId: z.string().min(1, { message: 'guideId obrigatório' }).optional(),
})

const blockSlotsBodySchema = z.object({
  dates: z
    .array(z.string().date('Data inválida'))
    .min(1, 'Informe ao menos uma data')
    .max(90, 'Máximo 90 datas'),
  reason: z.string().optional(),
})

const calendarQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato inválido (YYYY-MM)'),
})

const updateSlotBodySchema = z
  .object({
    startsAt: z.string().datetime({ message: 'Data inválida' }).optional(),
    capacity: z.number().int().min(1, { message: 'Capacidade mínima é 1' }).optional(),
    minCapacity: z.number().int().min(1, { message: 'Mínimo de participantes é 1' }).optional(),
  })
  .refine(
    (d) => {
      if (d.minCapacity !== undefined && d.capacity !== undefined)
        return d.minCapacity <= d.capacity
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

    // Leitura pública: só roteiro publicado (rascunho não expõe datas/vagas)
    const tourPackage = await prisma.tourPackage.findFirst({
      where: { id: params!.id, tenantId: tenant.id, active: true, publishedAt: { not: null } },
    })

    if (!tourPackage) {
      throw new AppError('Roteiro não encontrado', 404)
    }

    const slots = await prisma.departureSlot.findMany({
      where: {
        packageId: params!.id,
        status: 'OPEN',
        // Mesmo corte do createBooking: não oferecer datas que a reserva recusaria
        startsAt: { gte: new Date(Date.now() + BOOKING_CUTOFF_HOURS * 3600_000) },
      },
      orderBy: { startsAt: 'asc' },
    })

    return slots.map((slot) => ({
      ...slot,
      hasMinimumReached: slot.booked >= slot.minCapacity,
    }))
  })

  app.post(
    '/tenants/:slug/packages/:id/slots',
    {
      preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN, Role.SUPER_ADMIN])],
    },
    async (request, reply) => {
      const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
      if (error) return

      let body
      try {
        body = createSlotBodySchema.parse(request.body)
      } catch (err) {
        if (err instanceof ZodError) {
          const pastDateIssue = err.issues.find(
            (e) => e.message === 'A data do slot deve ser no futuro',
          )
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

      const user = request.user as EditUser
      if (!canEditPackage(user, pkg)) throw new AppError('Acesso negado', 403)
      if (await isUnverifiedGuide(user))
        throw new AppError('Guia não aprovado para criar slots', 403)

      // Guia do tenant, aprovado, parte do roteiro; CONDUTOR só agenda a si mesmo
      await assertGuideAssignable(user, body!.guideId, tenant.id, pkg)

      // Transação: conflito de agenda (duração + buffer) + criação
      let slot
      try {
        slot = await prisma.$transaction(async (tx) => {
          await assertGuideFree(tx, body!.guideId, pkg, [new Date(body!.startsAt)])
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
    },
  )

  app.patch(
    '/tenants/:slug/packages/:id/slots/:slotId',
    {
      preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN, Role.SUPER_ADMIN])],
    },
    async (request, reply) => {
      const { data: params, error } = parseParams(
        slugIdAndSlotIdParamsSchema,
        request.params,
        reply,
      )
      if (error) return

      const { data: body, error: bodyError } = parseBody(updateSlotBodySchema, request.body, reply)
      if (bodyError) return

      const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)

      const slot = await prisma.departureSlot.findFirst({
        where: { id: params!.slotId, package: { tenantId: tenant.id } },
        include: {
          package: {
            select: {
              conductorId: true,
              tenantId: true,
              id: true,
              durationMaxHours: true,
              duration: true,
              bufferMinutes: true,
            },
          },
        },
      })
      if (!slot) throw new AppError('Slot não encontrado', 404)
      if (slot.package.id !== params!.id) throw new AppError('Slot não encontrado', 404)

      const user = request.user as EditUser
      if (!canEditPackage(user, slot.package)) throw new AppError('Acesso negado', 403)

      let updated
      try {
        updated = await prisma.$transaction(async (tx) => {
          // Lock: reservas concorrentes não podem mudar `booked` no meio da validação
          const [row] = await tx.$queryRaw<
            Array<{
              status: string
              booked: number
              capacity: number
              minCapacity: number
              guideId: string | null
              startsAt: Date
            }>
          >`
            SELECT status, booked, capacity, "minCapacity", "guideId", "startsAt"
            FROM "DepartureSlot" WHERE id = ${params!.slotId} FOR UPDATE
          `
          if (!row) throw new AppError('Slot não encontrado', 404)
          if (row.status !== 'OPEN' && row.status !== 'FULL') {
            throw new AppError('Só é possível editar datas abertas ou lotadas', 422)
          }

          const capacity = body!.capacity ?? row.capacity
          const minCapacity = body!.minCapacity ?? row.minCapacity
          if (capacity < row.booked) {
            throw new AppError(
              `Capacidade não pode ser menor que as ${row.booked} vaga(s) já reservada(s)`,
              422,
            )
          }
          if (minCapacity > capacity) {
            throw new AppError('Mínimo não pode exceder capacidade máxima', 422)
          }

          const data: Prisma.DepartureSlotUpdateInput = {
            capacity,
            minCapacity,
            // Status acompanha a capacidade: lotada reabre ao ganhar vagas e vice-versa
            status: row.booked >= capacity ? 'FULL' : 'OPEN',
          }

          if (body!.startsAt !== undefined) {
            const newStart = new Date(body!.startsAt)
            if (newStart.getTime() !== new Date(row.startsAt).getTime()) {
              if (newStart.getTime() <= Date.now()) {
                throw new AppError('A data do slot deve ser no futuro', 422)
              }
              // Cliente pagou por um horário: mudar sem aviso é quebra de contrato
              if (row.booked > 0) {
                throw new AppError(
                  'Esta data tem reservas — cancele e crie outra data em vez de mudar o horário',
                  409,
                )
              }
              if (row.guideId) {
                await assertGuideFree(tx, row.guideId, slot.package, [newStart], params!.slotId)
              }
              data.startsAt = newStart
            }
          }

          return tx.departureSlot.update({ where: { id: params!.slotId }, data })
        })
      } catch (err) {
        if (err instanceof ScheduleConflictError) {
          return reply.status(err.statusCode).send({ code: err.code, message: err.message })
        }
        throw err
      }

      return reply.status(200).send(updated)
    },
  )

  // POST /tenants/:slug/packages/:id/slots/batch — batch slot creation
  app.post(
    '/tenants/:slug/packages/:id/slots/batch',
    {
      preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN, Role.SUPER_ADMIN])],
    },
    async (request, reply) => {
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

      const user = request.user as EditUser
      if (!canEditPackage(user, pkg)) throw new AppError('Acesso negado', 403)
      if (await isUnverifiedGuide(user))
        throw new AppError('Guia não aprovado para criar slots', 403)

      // CONDUTOR sem guideId agenda a si mesmo (slot sem guia não entra em agenda nenhuma)
      let guideId = body!.guideId
      if (!guideId && user.role === 'CONDUTOR') {
        const own = await prisma.guideProfile.findUnique({
          where: { userId: user.sub },
          select: { id: true },
        })
        guideId = own?.id
      }
      if (guideId) await assertGuideAssignable(user, guideId, tenant.id, pkg)

      if (body!.startDate > body!.endDate) {
        return reply.status(400).send({ message: 'Data inicial deve ser anterior à data final' })
      }

      // Datas e horário de São Paulo — não do fuso do servidor
      const now = Date.now()
      const slots = eachDate(body!.startDate, body!.endDate)
        .filter((date) => body!.daysOfWeek.includes(weekdayOf(date)))
        .map((date) => tourDateTime(date, body!.timeOfDay))
        .filter((startsAt) => startsAt.getTime() > now)
        .map((startsAt) => ({
          packageId: params!.id,
          ...(guideId ? { guideId } : {}),
          startsAt,
          capacity: body!.capacity,
          booked: 0,
          status: 'OPEN' as const,
        }))

      if (slots.length === 0) {
        return reply
          .status(400)
          .send({ message: 'Nenhum slot gerado para o período e dias informados' })
      }

      let created
      try {
        created = await prisma.$transaction(async (tx) => {
          // Mesma regra do slot unitário: duração + buffer, contra a agenda e dentro do lote
          if (guideId)
            await assertGuideFree(
              tx,
              guideId,
              pkg,
              slots.map((sl) => sl.startsAt),
            )
          return tx.departureSlot.createMany({ data: slots })
        })
      } catch (err) {
        if (err instanceof ScheduleConflictError) {
          return reply.status(err.statusCode).send({ code: err.code, message: err.message })
        }
        throw err
      }

      return reply.status(201).send({ created: created.count })
    },
  )

  // PATCH /tenants/:slug/packages/:id/slots/block — block/cancel slots by date
  app.patch(
    '/tenants/:slug/packages/:id/slots/block',
    {
      preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN, Role.SUPER_ADMIN])],
    },
    async (request, reply) => {
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

      const user = request.user as EditUser
      if (!canEditPackage(user, pkg)) throw new AppError('Acesso negado', 403)

      // Dia inteiro em São Paulo (não no fuso do servidor)
      const dateRanges = body!.dates.map((dateStr) => {
        const { start: dayStart, end: dayEnd } = tourDayRange(dateStr)
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
        ...new Set(slots.filter((s) => s.booked > 0).map((s) => tourDateKey(s.startsAt))),
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
    },
  )

  // GET /tenants/:slug/packages/:id/slots/manage — painel de disponibilidade: todas as
  // datas futuras (qualquer status, roteiro em rascunho, dentro do corte de 24h). A
  // listagem pública esconde exatamente isso.
  app.get(
    '/tenants/:slug/packages/:id/slots/manage',
    {
      preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN, Role.SUPER_ADMIN])],
    },
    async (request, reply) => {
      const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
      if (error) return

      const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)

      const pkg = await prisma.tourPackage.findFirst({
        where: { id: params!.id, tenantId: tenant.id },
      })
      if (!pkg) throw new AppError('Roteiro não encontrado', 404)

      const user = request.user as EditUser
      if (!canEditPackage(user, pkg)) throw new AppError('Acesso negado', 403)

      return prisma.departureSlot.findMany({
        where: { packageId: params!.id, startsAt: { gte: new Date() } },
        orderBy: { startsAt: 'asc' },
      })
    },
  )

  // GET /tenants/:slug/packages/:id/slots/calendar?month=YYYY-MM
  app.get(
    '/tenants/:slug/packages/:id/slots/calendar',
    {
      preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN, Role.SUPER_ADMIN])],
    },
    async (request, reply) => {
      const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
      if (error) return

      const { data: query, error: queryError } = parseQuery(
        calendarQuerySchema,
        request.query,
        reply,
      )
      if (queryError) return

      const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)

      const pkg = await prisma.tourPackage.findFirst({
        where: { id: params!.id, tenantId: tenant.id },
      })
      if (!pkg) throw new AppError('Roteiro não encontrado', 404)
      // Mesma permissão das demais rotas de gestão de datas
      if (!canEditPackage(request.user as EditUser, pkg)) throw new AppError('Acesso negado', 403)

      const [year, month] = query!.month.split('-').map(Number)
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
      const monthStart = tourDayRange(`${query!.month}-01`).start
      const monthEnd = tourDayRange(`${query!.month}-${String(lastDay).padStart(2, '0')}`).end

      const slots = await prisma.departureSlot.findMany({
        where: {
          packageId: params!.id,
          startsAt: { gte: monthStart, lte: monthEnd },
        },
        orderBy: { startsAt: 'asc' },
      })

      const days: Record<
        string,
        Array<{
          id: string
          startsAt: Date
          capacity: number
          booked: number
          status: string
        }>
      > = {}

      for (const slot of slots) {
        const dateKey = tourDateKey(slot.startsAt)
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
    },
  )

  app.delete(
    '/tenants/:slug/packages/:id/slots/:slotId',
    {
      preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN, Role.SUPER_ADMIN])],
    },
    async (request, reply) => {
      const { data: params, error } = parseParams(
        slugIdAndSlotIdParamsSchema,
        request.params,
        reply,
      )
      if (error) return

      const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)

      const user = request.user as EditUser

      await prisma.$transaction(async (tx) => {
        const slot = await tx.departureSlot.findFirst({
          where: { id: params!.slotId, package: { tenantId: tenant.id } },
          include: { package: { select: { conductorId: true, tenantId: true, id: true } } },
        })
        if (!slot) throw new AppError('Slot não encontrado', 404)
        if (slot.package.id !== params!.id) throw new AppError('Slot não encontrado', 404)
        if (!canEditPackage(user, slot.package)) throw new AppError('Acesso negado', 403)
        if (slot.status === 'CANCELLED') throw new AppError('Slot já cancelado', 400)

        // Reserva paga não pode ficar presa num slot cancelado: o estorno é feito antes, reserva a reserva
        const confirmed = await tx.booking.count({
          where: { slotId: params!.slotId, status: 'CONFIRMED' },
        })
        if (confirmed > 0) {
          throw new AppError('Esta data tem reservas confirmadas. Cancele-as antes de fechar.', 409)
        }

        // Fecha a data primeiro: createBooking exige OPEN, então nenhuma reserva nova entra
        await tx.departureSlot.update({
          where: { id: params!.slotId },
          data: { status: 'CANCELLED' },
        })
      })

      // Reservas que sobraram: pendentes (cancela o PIX no MP) e alguma confirmada que
      // tenha entrado em corrida com a checagem acima (estorna)
      const active = await prisma.booking.findMany({
        where: { slotId: params!.slotId, status: { in: ['PENDING', 'CONFIRMED'] } },
        select: { id: true, status: true, slotId: true, pax: true, paymentId: true },
      })
      let bookingsCancelled = 0
      for (const booking of active) {
        try {
          await cancelBooking(booking, request.log)
          bookingsCancelled++
        } catch (err) {
          if (err instanceof AppError && err.statusCode === 409) continue // já mudou
          throw err
        }
      }

      return reply.status(200).send({ message: 'Slot cancelado', bookingsCancelled })
    },
  )
}
