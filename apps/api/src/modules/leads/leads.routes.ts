import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { parseBody } from '../../shared/utils/zod-error'
import { whatsappSchema } from '../../shared/validation/whatsapp'
import { notifyLeadCreated } from './lead-notify'

const utm = z.string().trim().max(100, { message: 'Valor muito longo' }).optional()

const leadBodySchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[^\p{Cc}]+$/u, { message: 'Nome inválido' })
    .min(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
    .max(80, { message: 'Nome deve ter no máximo 80 caracteres' }),
  whatsapp: whatsappSchema,
  destinationSlug: z.string().trim().min(1, { message: 'Destino obrigatório' }).max(100),
  packageId: z.string().trim().min(1).max(100).optional(),
  travelMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Mês inválido' }).optional(),
  consent: z.literal(true, { message: 'Consentimento obrigatório' }),
  utmSource: utm,
  utmMedium: utm,
  utmCampaign: utm,
  utmContent: utm,
  utmTerm: utm,
})

export async function leadsRoutes(app: FastifyInstance) {
  app.post('/leads', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { data: body, error } = parseBody(leadBodySchema, request.body, reply)
    if (error) return

    const destination = await prisma.destination.findFirst({
      where: { slug: body.destinationSlug, active: true, approvalStatus: 'APPROVED' },
      select: { id: true, title: true },
    })
    if (!destination) throw new AppError('Destino não encontrado', 404)

    let packageName: string | undefined
    if (body.packageId) {
      const pkg = await prisma.tourPackage.findFirst({
        where: { id: body.packageId },
        select: { name: true },
      })
      if (!pkg) throw new AppError('Roteiro não encontrado', 404)
      packageName = pkg.name
    }

    const lead = await prisma.lead.create({ data: body })

    try {
      await notifyLeadCreated(request.log, { ...lead, destinationTitle: destination.title, packageName })
    } catch (err) {
      request.log.warn({ err }, 'Falha ao notificar novo lead')
    }

    return reply.status(201).send({ id: lead.id })
  })
}
