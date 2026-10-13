import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { parseBody, parseParams } from '../../../shared/utils/zod-error'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { getResend, getEmailFrom } from '../../../shared/email'
import { bookingCreatedEmailText, bookingCreatedSubject } from '../emails/booking-created-email'
import { bookingGuideNotificationEmailText, bookingGuideNotificationSubject } from '../emails/booking-guide-notification-email'
import { createBooking } from '../booking.service'
import { auditLog } from '../../../shared/audit.js'
import { bookingsCreatedCounter } from '../../../shared/metrics.js'
import { Sentry } from '../../../shared/sentry'

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

const createBookingBodySchema = z.object({
  slotId: z.string().min(1, { message: 'slotId obrigatório' }),
  customerName: z.string().min(1, { message: 'Nome do cliente obrigatório' }),
  customerEmail: z.string().email({ message: 'Email do cliente inválido' }),
  customerPhone: z.string().min(1, { message: 'Telefone do cliente obrigatório' }),
  customerCpf: z.string()
    .regex(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos numéricos' })
    .refine(isValidCPF, { message: 'CPF inválido' }),
  pax: z.number().int().positive({ message: 'Número de participantes deve ser inteiro positivo' }).max(100, { message: 'Número de participantes não pode exceder 100' }),
})

const slugParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
})

export async function createBookingRoute(app: FastifyInstance) {
  app.post('/tenants/:slug/bookings', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { data: params, error: paramsError } = parseParams(slugParamsSchema, request.params, reply)
    if (paramsError) return

    const { data: body, error: bodyError } = parseBody(createBookingBodySchema, request.body, reply)
    if (bodyError) return

    const { slug } = params

    Sentry.setTag('module', 'bookings')
    Sentry.setTag('tenant', slug)
    Sentry.setTag('action', 'create')

    const { slotId, customerName, customerEmail, customerPhone, customerCpf, pax } = body

    const expiryMinutes = Number(process.env.BOOKING_EXPIRY_MINUTES ?? '30')

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    })

    if (!tenant) {
      throw new AppError('Tenant não encontrado', 404)
    }

    // Rate limit por email para prevenir abuso sem auth
    const recentBookings = await prisma.booking.count({
      where: {
        customerEmail: body.customerEmail,
        tenantId: tenant.id,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    })

    if (recentBookings >= 3) {
      throw new AppError('Limite de reservas por hora atingido para este email', 429)
    }

    // DATA-02: Tenant approval gate — generic message per D-12 (do not expose real reason)
    if (tenant.approvalStatus !== 'APPROVED') {
      throw new AppError('Reservas indisponíveis no momento.', 403)
    }

    // HARDENING-01: Idempotency check — deve vir ANTES do $transaction
    const idempotencyKey = (request.headers['idempotency-key'] as string | undefined)?.trim() || undefined

    if (idempotencyKey) {
      const existing = await prisma.booking.findUnique({
        where: { tenantId_idempotencyKey: { tenantId: tenant.id, idempotencyKey } },
      })
      if (existing && existing.tenantId === tenant.id) {
        return reply.status(200).send({
          id: existing.id,
          tenantId: existing.tenantId,
          slotId: existing.slotId,
          customerName: existing.customerName,
          customerEmail: existing.customerEmail,
          pax: existing.pax,
          status: existing.status,
          paymentId: existing.paymentId,
          paymentUrl: existing.paymentUrl,
          expiresAt: existing.expiresAt,
          createdAt: existing.createdAt,
          qrCode: existing.qrCode,
        })
      }
    }

    const result = await createBooking({
      tenantId: tenant.id,
      tenantSlug: slug,
      slotId,
      customerName,
      customerEmail,
      customerPhone,
      cpf: customerCpf,
      pax,
      expiryMinutes,
      idempotencyKey,
    }, app.log)

    const { booking, qrCode, conductorEmail, departureStartsAt, packageName } = result

    // NOTIF-01: Notify customer of pending booking with PIX details (fire-and-forget)
    const resend = getResend()
    if (resend) {
      resend.emails
        .send({
          from: getEmailFrom(),
          to: [customerEmail],
          subject: bookingCreatedSubject,
          text: bookingCreatedEmailText({
            bookingId: booking.id,
            customerName,
            qrCode,
            paymentUrl: result.paymentUrl ?? '',
            expiresAt: booking.expiresAt ?? new Date(),
            cancelToken: booking.cancelToken,
            tenantSlug: slug,
          }),
        })
        .catch((emailErr: unknown) => {
          app.log.warn({ err: emailErr }, '[email] Failed to send booking-created email')
        })
    }

    // NOTIF-05: Notify guide of new booking (fire-and-forget)
    if (resend && conductorEmail) {
      resend.emails
        .send({
          from: getEmailFrom(),
          to: [conductorEmail],
          subject: bookingGuideNotificationSubject,
          text: bookingGuideNotificationEmailText({
            customerName,
            pax,
            packageName,
            slotDate: departureStartsAt,
          }),
        })
        .catch((emailErr: unknown) => {
          app.log.warn({ err: emailErr }, '[email] Failed to send guide notification email')
        })
    }

    bookingsCreatedCounter.add(1, { tenant: slug })

    auditLog(prisma, { actorType: 'USER', action: 'booking.created', targetType: 'BOOKING', targetId: booking.id, ipAddress: request.ip, metadata: { tenantSlug: slug, pax: body.pax, slotId: body.slotId } })

    return reply.status(201).send({
      id: booking.id,
      tenantId: booking.tenantId,
      slotId: booking.slotId,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      pax: booking.pax,
      status: booking.status,
      paymentId: booking.paymentId,
      paymentUrl: booking.paymentUrl,
      expiresAt: booking.expiresAt,
      createdAt: booking.createdAt,
      qrCode,
    })
  })
}
