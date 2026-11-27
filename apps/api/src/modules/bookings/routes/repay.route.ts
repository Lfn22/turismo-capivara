import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { repayBodySchema, type RepayBody } from '../bookings.schemas'
import * as paymentService from '../../../services/payment.service'
import { isValidCPF } from '../../../shared/utils/cpf'
import { clientIp } from '../../../shared/utils/client-ip'
import { assertBeforeBookingCutoff } from '../booking-cutoff'
import { guidesFor } from '../../../shared/utils/money'

const guidesInsufficient = (pax: number) =>
  new AppError(`Este horário não tem guias suficientes para ${pax} pessoas`, 422)

export async function repayRoute(app: FastifyInstance) {
  // POST /tenants/:slug/bookings/repay — public, no JWT — EXPIRED bookings only
  app.post<{ Params: { slug: string }; Body: RepayBody }>(
    '/tenants/:slug/bookings/repay',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
          keyGenerator: (req) => `repay:ip:${clientIp(req)}`,
        },
      },
    },
    async (request, reply) => {
      const parsed = repayBodySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ message: parsed.error.issues[0]?.message ?? 'Dados inválidos' })
      }
      const { slug } = request.params
      const { email, code, cpf } = parsed.data

      if (cpf && !/^\d{11}$/.test(cpf)) {
        return reply.status(400).send({ message: 'CPF deve conter 11 dígitos numéricos' })
      }
      if (cpf && !isValidCPF(cpf)) {
        return reply.status(400).send({ message: 'CPF inválido' })
      }

      const tenant = await prisma.tenant.findUnique({ where: { slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)

      const normalizedEmail = email.trim().toLowerCase()

      const booking = await prisma.booking.findFirst({
        where: { code: code.toLowerCase(), tenantId: tenant.id },
        include: {
          slot: {
            select: {
              startsAt: true,
              package: { select: { name: true, price: true } },
            },
          },
        },
      })

      if (!booking || booking.customerEmail.toLowerCase() !== normalizedEmail) {
        throw new AppError('Reserva não encontrada ou dados inválidos', 404)
      }

      if (booking.status !== 'EXPIRED') {
        throw new AppError('Novo pagamento só é possível para reservas expiradas', 422)
      }

      // Reserva anterior ao preço por grupo não tem valor gravado: não dá para recobrar
      if (booking.amount == null) {
        throw new AppError(
          'Esta reserva é anterior ao novo modelo de preço. Faça uma nova reserva.',
          422,
        )
      }

      // Verify slot is still OPEN (and its roteiro published and active) before creating a new payment
      const slot = await prisma.departureSlot.findUnique({
        where: { id: booking.slotId },
        select: {
          status: true,
          booked: true,
          maxGuides: true,
          package: { select: { active: true, publishedAt: true } },
        },
      })
      // A reserva ocupa o horário inteiro: checa antes de gerar o PIX (evita criar e cancelar)
      if (
        !slot ||
        slot.status !== 'OPEN' ||
        slot.booked !== 0 ||
        !slot.package.active ||
        slot.package.publishedAt === null
      ) {
        throw new AppError('Slot indisponível para novo pagamento', 422)
      }
      if (guidesFor(booking.pax) > slot.maxGuides) throw guidesInsufficient(booking.pax)

      // Mesmo corte de uma reserva nova: não cobra para passeio a menos de 24h
      assertBeforeBookingCutoff(booking.slot.startsAt)

      // Create new MP payment
      // CPF original não é recuperável (apenas hash armazenado) — cliente pode fornecer CPF no body
      const transactionAmount = Number(booking.amount)
      const expiryMinutes = Number(process.env.BOOKING_EXPIRY_MINUTES ?? '30')
      const paymentResult = await paymentService.createPixPayment({
        bookingId: booking.id,
        transactionAmount,
        description: `Reserva #${booking.id} — ${booking.slot.package.name}`,
        customerEmail: booking.customerEmail,
        customerCpf: cpf,
        // Prazo igual ao de uma reserva nova (sem isto o MP dava 24h e a vaga ficava presa)
        expiresAt: new Date(Date.now() + expiryMinutes * 60_000),
        // Chave própria por tentativa: o bookingId já foi usado na cobrança original
        idempotencyKey: `${booking.id}:repay:${randomUUID()}`,
      })

      // Lock slot and update booking atomically to prevent race condition
      // CR-003: on DB failure, cancel the MP payment to avoid orphaned charges
      try {
        await prisma.$transaction(async (tx) => {
          const [slotRow] = await tx.$queryRaw<
            Array<{ status: string; booked: number; maxGuides: number }>
          >`
          SELECT status, booked, "maxGuides" FROM "DepartureSlot"
          WHERE id = ${booking.slotId}
          FOR UPDATE
        `
          // A reserva ocupa o horário inteiro: só reativa se ele continua vazio e aberto
          if (!slotRow || slotRow.status !== 'OPEN' || slotRow.booked !== 0) {
            // MP payment was created but slot is gone — log for manual reconciliation
            throw new AppError('Slot indisponível para novo pagamento', 422)
          }
          if (guidesFor(booking.pax) > slotRow.maxGuides) throw guidesInsufficient(booking.pax)
          // Transição condicional: um repay concorrente (clique duplo) já reativou a reserva
          const reactivated = await tx.booking.updateMany({
            where: { id: booking.id, status: 'EXPIRED' },
            data: {
              paymentId: paymentResult.paymentId,
              paymentUrl: paymentResult.paymentUrl,
              qrCode: paymentResult.qrCode,
              expiresAt: paymentResult.expiresAt,
              status: 'PENDING',
            },
          })
          if (reactivated.count === 0) {
            throw new AppError('Um novo pagamento já foi gerado para esta reserva', 409)
          }
          await tx.departureSlot.update({
            where: { id: booking.slotId },
            data: { booked: booking.pax, status: 'FULL' },
          })
        })
      } catch (txErr) {
        await paymentService.cancelPixPayment(paymentResult.paymentId).catch((e) => {
          app.log.error(e, '[repay] cancelPixPayment falhou após falha na transação DB')
        })
        throw txErr
      }

      return reply.status(200).send({
        qrCode: paymentResult.qrCode,
        paymentUrl: paymentResult.paymentUrl,
        expiresAt: paymentResult.expiresAt,
      })
    },
  )
}
