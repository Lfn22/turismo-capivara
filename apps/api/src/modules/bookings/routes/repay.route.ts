import { FastifyInstance } from 'fastify'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { repayBodySchema, type RepayBody } from '../bookings.schemas'
import * as paymentService from '../../../services/payment.service'

function isValidCPF(cpf: string): boolean {
  // Rejeitar sequências de dígitos iguais (00000000000, 11111111111, etc.)
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const digits = cpf.split('').map(Number)

  // Dígito verificador 1: soma dos 9 primeiros × pesos 10..2
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i)
  }
  let remainder = sum % 11
  const digit1 = remainder < 2 ? 0 : 11 - remainder

  if (digits[9] !== digit1) return false

  // Dígito verificador 2: soma dos 10 primeiros × pesos 11..2
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * (11 - i)
  }
  remainder = sum % 11
  const digit2 = remainder < 2 ? 0 : 11 - remainder

  return digits[10] === digit2
}

export async function repayRoute(app: FastifyInstance) {
  // POST /tenants/:slug/bookings/repay — public, no JWT — EXPIRED bookings only
  app.post<{ Params: { slug: string }; Body: RepayBody }>(
    '/tenants/:slug/bookings/repay',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
          keyGenerator: (req) => `repay:ip:${req.ip}`,
        },
      },
    },
    async (request, reply) => {
      const parsed = repayBodySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' })
      }
      const { slug } = request.params
      const { email, code, cpf } = parsed.data

      if (cpf && !/^\d{11}$/.test(cpf)) {
        return reply.status(400).send({ error: 'CPF deve conter 11 dígitos numéricos' })
      }
      if (cpf && !isValidCPF(cpf)) {
        return reply.status(400).send({ error: 'CPF inválido' })
      }

      const tenant = await prisma.tenant.findUnique({ where: { slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)

      const normalizedEmail = email.trim().toLowerCase()

      // TODO WR-002: endsWith gera LIKE '%suffix' sem índice — migrar para campo `code String @unique`
      const booking = await prisma.booking.findFirst({
        where: { id: { endsWith: code.toLowerCase() }, tenantId: tenant.id },
        orderBy: { createdAt: 'desc' },
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

      // Verify slot is still OPEN before creating a new payment
      const slot = await prisma.departureSlot.findUnique({
        where: { id: booking.slotId },
        select: { status: true },
      })
      if (!slot || slot.status !== 'OPEN') {
        throw new AppError('Slot indisponível para novo pagamento', 422)
      }

      // Create new MP payment
      // CPF original não é recuperável (apenas hash armazenado) — cliente pode fornecer CPF no body
      const transactionAmount = Number(booking.slot.package.price) * booking.pax
      const paymentResult = await paymentService.createPixPayment({
        bookingId: booking.id,
        transactionAmount,
        description: `Reserva #${booking.id} — ${booking.slot.package.name}`,
        customerEmail: booking.customerEmail,
        customerCpf: cpf ?? '',
      })

      // Lock slot and update booking atomically to prevent race condition
      // CR-003: on DB failure, cancel the MP payment to avoid orphaned charges
      try { await prisma.$transaction(async (tx) => {
        const [slotRow] = await tx.$queryRaw<Array<{ status: string; booked: number; capacity: number }>>`
          SELECT status, booked, capacity FROM "DepartureSlot"
          WHERE id = ${booking.slotId}
          FOR UPDATE
        `
        if (!slotRow || slotRow.status !== 'OPEN') {
          // MP payment was created but slot is gone — log for manual reconciliation
          throw new AppError('Slot indisponível para novo pagamento', 422)
        }
        if (slotRow.booked + booking.pax > slotRow.capacity) {
          throw new AppError('SLOT_UNAVAILABLE', 409)
        }
        const newBooked = slotRow.booked + booking.pax
        await tx.departureSlot.update({
          where: { id: booking.slotId },
          data: {
            booked: { increment: booking.pax },
            status: newBooked >= slotRow.capacity ? 'FULL' : 'OPEN',
          },
        })
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            paymentId: paymentResult.paymentId,
            paymentUrl: paymentResult.paymentUrl,
            qrCode: paymentResult.qrCode,
            expiresAt: paymentResult.expiresAt,
            status: 'PENDING',
          },
        })
      }) } catch (txErr) {
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
    }
  )
}
