import { FastifyInstance, FastifyRequest } from 'fastify'
import multipart from '@fastify/multipart'
import { hashSync } from 'bcryptjs'
import { z, ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { hashCpf } from '../../shared/utils/hash'
import { notifyAffiliationRequested, notifyGuideRegistered } from '../notifications/guide-events'
import { CREDENTIAL_MAX_BYTES, CREDENTIAL_MIME, putCredential } from './credential.storage'

const credentialFields = {
  credentialType: z.enum(['ICMBIO', 'CADASTUR'], { message: 'Tipo de comprovante inválido' }),
  credentialNumber: z.string().trim().min(1).max(60).optional(),
}

const registerSchema = z
  .object({
    name: z.string().trim().min(1, { message: 'Nome obrigatório' }).max(120, { message: 'Nome muito longo' }),
    email: z.string().email({ message: 'Email inválido' }),
    password: z.string().min(8, { message: 'Senha deve ter no mínimo 8 caracteres' }),
    cpf: z.string().regex(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos numéricos' }),
    kind: z.enum(['AUTONOMO', 'ASSOCIACAO', 'AGENCIA'], { message: 'Tipo de cadastro inválido' }),
    tenantId: z.string().min(1).optional(),
    ...credentialFields,
  })
  .refine((v) => v.kind === 'AUTONOMO' || !!v.tenantId, {
    path: ['tenantId'],
    message: 'Escolha a agência ou associação',
  })

const credentialSchema = z.object(credentialFields)

function zodError400(err: ZodError, extra: { field: string; message: string }[] = []) {
  return {
    message: 'Dados inválidos',
    errors: [...err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })), ...extra],
  }
}

interface ParsedForm {
  fields: Record<string, string>
  file?: { buffer: Buffer; mimetype: string; tooLarge: boolean }
}

async function readForm(request: FastifyRequest): Promise<ParsedForm> {
  const form: ParsedForm = { fields: {} }
  if (!request.isMultipart()) return form
  try {
    for await (const part of request.parts()) {
      if (part.type === 'field') {
        if (typeof part.value === 'string') form.fields[part.fieldname] = part.value
        continue
      }
      if (part.fieldname !== 'file' || form.file) {
        part.file.resume()
        continue
      }
      const buffer = await part.toBuffer()
      form.file = { buffer, mimetype: part.mimetype, tooLarge: buffer.length > CREDENTIAL_MAX_BYTES }
    }
  } catch (err) {
    if ((err as { code?: string }).code !== 'FST_REQ_FILE_TOO_LARGE') throw err
    form.file = { buffer: Buffer.alloc(0), mimetype: 'application/pdf', tooLarge: true }
  }
  return form
}

const ASCII = (s: string) => Buffer.from(s, 'latin1')
const SIGNATURE_CHECK: Record<string, (b: Buffer) => boolean> = {
  'application/pdf': (b) => b.subarray(0, 5).equals(ASCII('%PDF-')),
  'image/jpeg': (b) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.subarray(0, 4).equals(ASCII('RIFF')) && b.subarray(8, 12).equals(ASCII('WEBP')),
}

/** Valida tipo, tamanho e assinatura (magic bytes) do comprovante. Devolve a mensagem 400 ou null se estiver ok. */
function fileProblem(file: NonNullable<ParsedForm['file']>): string | null {
  if (!CREDENTIAL_MIME.includes(file.mimetype)) return 'Envie o comprovante em JPEG, PNG, WebP ou PDF'
  if (file.tooLarge) return 'O comprovante deve ter até 10 MB'
  if (!SIGNATURE_CHECK[file.mimetype]?.(file.buffer)) return 'Envie o comprovante em JPEG, PNG, WebP ou PDF'
  return null
}

export async function guideSignupRoutes(app: FastifyInstance) {
  await app.register(multipart, {
    limits: { fileSize: CREDENTIAL_MAX_BYTES + 1, files: 1, fields: 10 },
  })

  // POST /auth/register-guide — porta única de cadastro de guia
  app.post(
    '/auth/register-guide',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const form = await readForm(request)

      const parsed = registerSchema.safeParse(form.fields)
      if (!parsed.success || !form.file) {
        const missingFile = form.file ? [] : [{ field: 'file', message: 'Comprovante obrigatório' }]
        return reply
          .status(400)
          .send(parsed.success ? { message: 'Dados inválidos', errors: missingFile } : zodError400(parsed.error, missingFile))
      }
      const body = parsed.data
      const file = form.file

      const problem = fileProblem(file)
      if (problem) return reply.status(400).send({ message: problem })

      let affiliationTenantId: string | null = null
      if (body.kind !== 'AUTONOMO') {
        const tenant = await prisma.tenant.findUnique({
          where: { id: body.tenantId },
          select: { id: true, slug: true, type: true, approvalStatus: true },
        })
        if (
          !tenant ||
          tenant.approvalStatus !== 'APPROVED' ||
          tenant.slug === 'independente' ||
          tenant.type !== body.kind
        ) {
          throw new AppError('Agência não encontrada', 404)
        }
        affiliationTenantId = tenant.id
      }

      let systemTenant = await prisma.tenant.findFirst({ where: { slug: 'independente' } })
      if (!systemTenant) {
        systemTenant = await prisma.tenant.create({
          data: { slug: 'independente', name: 'Guias Independentes', type: 'AGENCIA' },
        })
      }

      // Se a transação falhar, o arquivo fica órfão no R2 (aceitável)
      const credentialDocKey = await putCredential(file.buffer, file.mimetype)
      const hashedPassword = hashSync(body.password, 10)

      let result: { userId: string; affiliationId: string | null }
      try {
        result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              tenantId: systemTenant!.id,
              name: body.name,
              email: body.email.toLowerCase(),
              password: hashedPassword,
              role: 'CONDUTOR',
              cpf: hashCpf(body.cpf),
            },
            select: { id: true },
          })
          const profile = await tx.guideProfile.create({
            data: {
              userId: user.id,
              especialidades: [],
              regioes: [],
              portfolioPhotos: [],
              credentialType: body.credentialType,
              credentialNumber: body.credentialNumber,
              credentialDocKey,
              credentialSubmittedAt: new Date(),
            },
            select: { id: true },
          })
          let affiliationId: string | null = null
          if (affiliationTenantId) {
            const affiliation = await tx.guideAffiliation.create({
              data: { guideId: profile.id, tenantId: affiliationTenantId, status: 'PENDING' },
              select: { id: true },
            })
            affiliationId = affiliation.id
          }
          return { userId: user.id, affiliationId }
        })
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const fields = err.meta?.target as string[] | undefined
          if (fields?.includes('cpf')) throw new AppError('CPF já cadastrado', 409)
          throw new AppError('E-mail já cadastrado', 409)
        }
        throw err
      }

      void notifyGuideRegistered(app.log, result.userId).catch(() => {})
      if (result.affiliationId) {
        void notifyAffiliationRequested(app.log, result.affiliationId).catch(() => {})
      }

      return reply.status(201).send({ message: 'Cadastro enviado. Aguarde a verificação.' })
    },
  )

  // GET /guides/me — status do próprio cadastro (nunca expõe a chave do comprovante)
  app.get('/guides/me', { preHandler: [authenticate, authorize(['CONDUTOR'])] }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: {
        approvalStatus: true,
        rejectionReason: true,
        tenant: { select: { slug: true } },
        guideProfile: {
          select: {
            id: true,
            bio: true,
            photoUrl: true,
            especialidades: true,
            regioes: true,
            portfolioPhotos: true,
            credentialType: true,
            credentialNumber: true,
            credentialSubmittedAt: true,
            affiliation: {
              select: {
                id: true,
                status: true,
                rejectionReason: true,
                tenant: { select: { name: true, type: true } },
              },
            },
          },
        },
      },
    })
    if (!user || !user.guideProfile) throw new AppError('Guia não encontrado', 404)
    const p = user.guideProfile
    return reply.send({
      approvalStatus: user.approvalStatus,
      rejectionReason: user.rejectionReason,
      credentialType: p.credentialType,
      credentialNumber: p.credentialNumber,
      credentialSubmittedAt: p.credentialSubmittedAt,
      tenantSlug: user.tenant.slug,
      profile: {
        id: p.id,
        bio: p.bio,
        photoUrl: p.photoUrl,
        especialidades: p.especialidades,
        regioes: p.regioes,
        portfolioPhotos: p.portfolioPhotos,
      },
      affiliation: p.affiliation
        ? {
            id: p.affiliation.id,
            tenantName: p.affiliation.tenant.name,
            tenantType: p.affiliation.tenant.type,
            status: p.affiliation.status,
            rejectionReason: p.affiliation.rejectionReason,
          }
        : null,
    })
  })

  // POST /guides/me/credential — reenvio do comprovante
  app.post(
    '/guides/me/credential',
    { preHandler: [authenticate, authorize(['CONDUTOR'])] },
    async (request, reply) => {
      const { sub } = request.user as { sub: string }
      const form = await readForm(request)

      const parsed = credentialSchema.safeParse(form.fields)
      if (!parsed.success || !form.file) {
        const missingFile = form.file ? [] : [{ field: 'file', message: 'Comprovante obrigatório' }]
        return reply
          .status(400)
          .send(parsed.success ? { message: 'Dados inválidos', errors: missingFile } : zodError400(parsed.error, missingFile))
      }
      const body = parsed.data

      const problem = fileProblem(form.file)
      if (problem) return reply.status(400).send({ message: problem })

      const user = await prisma.user.findUnique({ where: { id: sub }, select: { approvalStatus: true } })
      if (!user) throw new AppError('Guia não encontrado', 404)
      if (user.approvalStatus === 'APPROVED') throw new AppError('Seu cadastro já foi aprovado', 409)

      const credentialDocKey = await putCredential(form.file.buffer, form.file.mimetype)

      await prisma.$transaction(async (tx) => {
        await tx.guideProfile.update({
          where: { userId: sub },
          data: {
            credentialType: body.credentialType,
            credentialNumber: body.credentialNumber ?? null,
            credentialDocKey,
            credentialSubmittedAt: new Date(),
          },
        })
        await tx.user.update({
          where: { id: sub },
          data: { approvalStatus: 'PENDING', rejectionReason: null },
        })
      })

      void notifyGuideRegistered(app.log, sub).catch(() => {})

      return reply.send({ message: 'Comprovante reenviado. Aguarde a verificação.' })
    },
  )
}
