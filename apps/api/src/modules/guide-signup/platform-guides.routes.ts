import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { getResend, getEmailFrom } from '../../shared/email'
import { notifyGuideDecision } from '../notifications/guide-events'
import { guideApprovedEmailText, guideApprovedSubject } from '../bookings/emails/guide-approved-email'
import { guideRejectedEmailText, guideRejectedSubject } from '../bookings/emails/guide-rejected-email'
import { getCredential } from './credential.storage'
import { auditLog } from '../../shared/audit'
import { imageUrlSchema } from '../../shared/utils/image-url'
import { deleteReplacedPhoto } from '../uploads/replaced-photo'

const REASON_LABELS = {
  ILEGIVEL: 'Documento ilegível',
  VENCIDO: 'Documento vencido',
  NOME_DIFERENTE: 'Nome diferente do documento',
} as const

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

const listQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
})

const userIdParamsSchema = z.object({
  userId: z.string().min(1, { message: 'ID do guia obrigatório' }),
})

const rejectBodySchema = z
  .object({
    reasonCode: z.enum(['ILEGIVEL', 'VENCIDO', 'NOME_DIFERENTE', 'OUTRO'], { message: 'Motivo inválido' }),
    text: z
      .string()
      .trim()
      .min(3, { message: 'Motivo deve ter ao menos 3 caracteres' })
      .max(300, { message: 'Motivo deve ter no máximo 300 caracteres' })
      .optional(),
  })
  .refine((b) => b.reasonCode !== 'OUTRO' || b.text !== undefined, {
    path: ['text'],
    message: 'Descreva o motivo',
  })

const updateGuideBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
    .max(100, { message: 'Nome deve ter no máximo 100 caracteres' })
    .optional(),
  photoUrl: imageUrlSchema.nullable().optional(),
  bio: z.string().trim().max(2000, { message: 'Bio deve ter no máximo 2000 caracteres' }).nullable().optional(),
})

function zodError(err: ZodError) {
  return {
    message: 'Dados inválidos',
    errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
  }
}

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data)
}

export async function platformGuidesRoutes(app: FastifyInstance) {
  const staff = [authenticate, authorize(['SUPER_ADMIN'])]

  app.setErrorHandler((err, request, reply) => {
    if (err instanceof ZodError) return reply.status(400).send(zodError(err))
    throw err
  })

  // GET /platform/guides?status= — equipe: fila de verificação
  app.get('/platform/guides', { preHandler: staff }, async (request, reply) => {
    const query = parse(listQuerySchema, request.query)

    const profiles = await prisma.guideProfile.findMany({
      where: { user: { role: 'CONDUTOR', approvalStatus: query.status } },
      orderBy: { credentialSubmittedAt: 'asc' },
      select: {
        photoUrl: true,
        bio: true,
        credentialType: true,
        credentialNumber: true,
        credentialSubmittedAt: true,
        credentialDocKey: true,
        user: { select: { id: true, name: true, email: true, approvalStatus: true, rejectionReason: true } },
        affiliation: { select: { status: true, tenant: { select: { name: true } } } },
      },
    })

    return reply.status(200).send({
      guides: profiles.map((p) => ({
        userId: p.user.id,
        name: p.user.name,
        email: p.user.email,
        photoUrl: p.photoUrl,
        bio: p.bio,
        approvalStatus: p.user.approvalStatus,
        rejectionReason: p.user.rejectionReason,
        credentialType: p.credentialType,
        credentialNumber: p.credentialNumber,
        credentialSubmittedAt: p.credentialSubmittedAt,
        hasDocument: p.credentialDocKey != null,
        affiliation: p.affiliation
          ? { tenantName: p.affiliation.tenant.name, status: p.affiliation.status }
          : null,
      })),
    })
  })

  // GET /platform/guides/:userId/credential — equipe: repassa o comprovante do R2
  app.get('/platform/guides/:userId/credential', { preHandler: staff }, async (request, reply) => {
    const { userId } = parse(userIdParamsSchema, request.params)

    const profile = await prisma.guideProfile.findUnique({
      where: { userId },
      select: { credentialDocKey: true },
    })
    if (!profile?.credentialDocKey) throw new AppError('Comprovante não encontrado', 404)

    const { body, contentType } = await getCredential(profile.credentialDocKey)
    const ext = EXT_BY_MIME[contentType] ?? 'bin'

    return reply
      .header('Content-Type', contentType)
      .header('Cache-Control', 'private, no-store')
      .header('X-Content-Type-Options', 'nosniff')
      .header('Content-Disposition', `inline; filename="comprovante.${ext}"`)
      .send(body)
  })

  async function loadGuide(userId: string) {
    const guide = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, role: true, tenant: { select: { slug: true } } },
    })
    if (!guide || guide.role !== 'CONDUTOR') throw new AppError('Guia não encontrado', 404)
    return guide
  }

  // PATCH /platform/guides/:userId/approve
  app.patch('/platform/guides/:userId/approve', { preHandler: staff }, async (request, reply) => {
    const { userId } = parse(userIdParamsSchema, request.params)
    const decider = request.user as { sub: string }

    const guide = await loadGuide(userId)

    const { count } = await prisma.user.updateMany({
      where: { id: userId, role: 'CONDUTOR', approvalStatus: 'PENDING' },
      data: { approvalStatus: 'APPROVED', rejectionReason: null },
    })
    if (count === 0) throw new AppError('Cadastro já decidido', 409)

    const resend = getResend()
    if (resend && guide.email) {
      resend.emails
        .send({
          from: getEmailFrom(),
          to: guide.email,
          subject: guideApprovedSubject,
          text: guideApprovedEmailText({ guideName: guide.name ?? 'Guia', slug: guide.tenant.slug }),
        })
        .catch((emailErr: unknown) => {
          app.log.warn({ err: emailErr, userId }, '[email] Failed to send guide-approved email')
        })
    }

    void notifyGuideDecision(app.log, userId, { approved: true }, decider.sub).catch(() => {})

    return reply.status(200).send({ message: 'Guia aprovado com sucesso' })
  })

  // PATCH /platform/guides/:userId/reject
  app.patch('/platform/guides/:userId/reject', { preHandler: staff }, async (request, reply) => {
    const { userId } = parse(userIdParamsSchema, request.params)
    const body = parse(rejectBodySchema, request.body)
    const decider = request.user as { sub: string }

    const guide = await loadGuide(userId)
    const reason = body.reasonCode === 'OUTRO' ? body.text! : REASON_LABELS[body.reasonCode]

    const { count } = await prisma.user.updateMany({
      where: { id: userId, role: 'CONDUTOR', approvalStatus: 'PENDING' },
      data: { approvalStatus: 'REJECTED', rejectionReason: reason },
    })
    if (count === 0) throw new AppError('Cadastro já decidido', 409)

    const resend = getResend()
    if (resend && guide.email) {
      resend.emails
        .send({
          from: getEmailFrom(),
          to: guide.email,
          subject: guideRejectedSubject,
          text: guideRejectedEmailText({ guideName: guide.name ?? 'Guia', reason }),
        })
        .catch((emailErr: unknown) => {
          app.log.warn({ err: emailErr, userId }, '[email] Failed to send guide-rejected email')
        })
    }

    void notifyGuideDecision(app.log, userId, { approved: false, reason }, decider.sub).catch(() => {})

    return reply.status(200).send({ message: 'Guia rejeitado' })
  })

  // PATCH /platform/guides/:userId — equipe edita nome, foto e bio do guia
  app.patch('/platform/guides/:userId', { preHandler: staff }, async (request, reply) => {
    const { userId } = parse(userIdParamsSchema, request.params)
    const body = parse(updateGuideBodySchema, request.body)
    const actor = request.user as { sub: string }

    await loadGuide(userId)
    const previousPhotoUrl =
      body.photoUrl !== undefined
        ? (await prisma.guideProfile.findUnique({ where: { userId }, select: { photoUrl: true } }))?.photoUrl
        : undefined

    const profileData = {
      ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl }),
      ...(body.bio !== undefined && { bio: body.bio }),
    }

    const guide = await prisma.$transaction(async (tx) => {
      if (body.name !== undefined) {
        await tx.user.update({ where: { id: userId }, data: { name: body.name }, select: { id: true } })
      }
      if (Object.keys(profileData).length > 0) {
        await tx.guideProfile.upsert({
          where: { userId },
          create: { userId, especialidades: [], regioes: [], portfolioPhotos: [], ...profileData },
          update: profileData,
          select: { id: true },
        })
      }
      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, name: true, email: true, guideProfile: { select: { photoUrl: true, bio: true } } },
      })
    })

    if (body.photoUrl !== undefined) {
      await deleteReplacedPhoto(previousPhotoUrl, body.photoUrl, request.log)
    }

    const fields = [...(body.name !== undefined ? ['name'] : []), ...Object.keys(profileData)]
    auditLog(prisma, {
      actorType: 'USER',
      action: 'guide.updated',
      targetType: 'USER',
      targetId: userId,
      ipAddress: request.ip,
      metadata: { actorUserId: actor.sub, fields: fields.join(',') },
    })

    return reply.status(200).send({
      userId: guide.id,
      name: guide.name,
      email: guide.email,
      photoUrl: guide.guideProfile?.photoUrl ?? null,
      bio: guide.guideProfile?.bio ?? null,
    })
  })
}
