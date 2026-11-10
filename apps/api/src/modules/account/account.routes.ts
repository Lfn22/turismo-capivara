import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createHash, randomInt, timingSafeEqual } from 'crypto'
import { compareSync, hashSync } from 'bcryptjs'
import { Prisma } from '@prisma/client'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { parseBody } from '../../shared/utils/zod-error'
import { imageUrlSchema } from '../../shared/utils/image-url'
import { userRateLimit } from '../../shared/utils/user-rate-limit'
import { auditLog } from '../../shared/audit'
import { getResend, getEmailFrom } from '../../shared/email'
import { revokeAllUserTokens } from '../auth/token.service'
import { deleteReplacedPhoto } from '../uploads/replaced-photo'

const updateMeBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
    .max(100, { message: 'Nome deve ter no máximo 100 caracteres' })
    .optional(),
  photoUrl: imageUrlSchema.nullable().optional(),
})

const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, { message: 'Senha atual obrigatória' }),
  newPassword: z.string().min(8, { message: 'Senha deve ter no mínimo 8 caracteres' }),
})

const changeEmailBodySchema = z.object({
  password: z.string().min(1, { message: 'Senha obrigatória' }),
  newEmail: z.string().trim().toLowerCase().email({ message: 'Email inválido' }),
})

const confirmEmailBodySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, { message: 'Código deve ter 6 dígitos' }),
})

const EMAIL_CODE_TTL_MS = 15 * 60 * 1000
const EMAIL_CODE_MAX_ATTEMPTS = 5

const clearPendingEmail = {
  pendingEmail: null,
  emailChangeCodeHash: null,
  emailChangeExpiresAt: null,
  emailChangeAttempts: 0,
}

// Código amarrado ao usuário: o mesmo código de outro usuário gera outro hash
function hashEmailCode(userId: string, code: string): string {
  return createHash('sha256').update(`${userId}:${code}`).digest('hex')
}

function sameHash(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex')
  const bufB = Buffer.from(b, 'hex')
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

const accountSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  photoUrl: true,
  guideProfile: { select: { photoUrl: true } },
  tenant: { select: { id: true, slug: true, name: true, logoUrl: true, type: true } },
} as const

type AccountRow = Prisma.UserGetPayload<{ select: typeof accountSelect }>

// CONDUTOR: a foto da conta é a do perfil público (GuideProfile); demais papéis usam User.photoUrl
function toAccount(user: AccountRow) {
  const photoUrl = user.role === 'CONDUTOR' && user.guideProfile ? user.guideProfile.photoUrl : user.photoUrl
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    photoUrl,
    tenant: user.tenant,
  }
}

async function loadAccount(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: accountSelect })
  if (!user) throw new AppError('Usuário não encontrado', 404)
  return user
}

export async function accountRoutes(app: FastifyInstance) {
  app.get('/account/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await loadAccount(request.user.sub)
    return reply.send(toAccount(user))
  })

  app.patch('/account/me', { preHandler: [authenticate] }, async (request, reply) => {
    const { data: body, error } = parseBody(updateMeBodySchema, request.body, reply)
    if (error) return

    const current = await loadAccount(request.user.sub)
    const photoOnGuideProfile = current.role === 'CONDUTOR' && current.guideProfile !== null
    const previousPhotoUrl = toAccount(current).photoUrl

    await prisma.$transaction(async (tx) => {
      const userData = {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.photoUrl !== undefined && !photoOnGuideProfile && { photoUrl: body.photoUrl }),
      }
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: current.id }, data: userData, select: { id: true } })
      }
      if (body.photoUrl !== undefined && photoOnGuideProfile) {
        await tx.guideProfile.update({
          where: { userId: current.id },
          data: { photoUrl: body.photoUrl },
          select: { id: true },
        })
      }
    })

    if (body.photoUrl !== undefined) {
      await deleteReplacedPhoto(previousPhotoUrl, body.photoUrl, request.log)
    }

    const updated = await loadAccount(current.id)
    return reply.send(toAccount(updated))
  })

  app.post('/account/password', { preHandler: [authenticate], config: userRateLimit('account-password', 10) }, async (request, reply) => {
    const { data: body, error } = parseBody(changePasswordBodySchema, request.body, reply)
    if (error) return

    const user = await prisma.user.findUnique({ where: { id: request.user.sub }, select: { id: true, password: true } })
    if (!user) throw new AppError('Usuário não encontrado', 404)
    if (!compareSync(body.currentPassword, user.password)) throw new AppError('Senha atual incorreta', 400)

    const hashedPassword = hashSync(body.newPassword, 10)

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { password: hashedPassword }, select: { id: true } })
      await revokeAllUserTokens(user.id, tx)
    })

    auditLog(prisma, {
      actorType: 'USER',
      action: 'account.password_changed',
      targetType: 'USER',
      targetId: user.id,
      ipAddress: request.ip,
      metadata: { actorUserId: user.id },
    })

    return reply.status(204).send()
  })

  // Passo 1: confere a senha e envia um código de 6 dígitos para o NOVO e-mail
  app.post('/account/email', { preHandler: [authenticate], config: userRateLimit('account-email', 5) }, async (request, reply) => {
    const { data: body, error } = parseBody(changeEmailBodySchema, request.body, reply)
    if (error) return

    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { id: true, email: true, password: true },
    })
    if (!user) throw new AppError('Usuário não encontrado', 404)
    if (!compareSync(body.password, user.password)) throw new AppError('Senha incorreta', 400)
    if (body.newEmail === user.email) throw new AppError('O novo e-mail é igual ao atual', 400)

    const taken = await prisma.user.findUnique({ where: { email: body.newEmail }, select: { id: true } })
    if (taken) throw new AppError('E-mail já cadastrado', 409)

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pendingEmail: body.newEmail,
        emailChangeCodeHash: hashEmailCode(user.id, code),
        emailChangeExpiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS),
        emailChangeAttempts: 0,
      },
      select: { id: true },
    })

    const resend = getResend()
    if (resend) {
      await resend.emails.send({
        from: getEmailFrom(),
        to: body.newEmail,
        subject: 'Código de confirmação de e-mail — CAPI',
        html: `
          <p>Recebemos uma solicitação para usar este endereço como e-mail de acesso a uma conta CAPI.</p>
          <p>Seu código de confirmação é: <strong>${code}</strong></p>
          <p>O código é válido por 15 minutos.</p>
          <p>Se você não fez essa solicitação, ignore este e-mail.</p>
        `.trim(),
      })
    } else {
      // Dev: sem Resend configurado, o código vai para o log (mesmo padrão do reset de senha)
      console.log(`[email-change] Código para ${body.newEmail}: ${code}`)
    }

    return reply.status(202).send({ pendingEmail: body.newEmail })
  })

  // Passo 2: confere o código e efetiva a troca
  app.post('/account/email/confirm', { preHandler: [authenticate], config: userRateLimit('account-email-confirm', 10) }, async (request, reply) => {
    const { data: body, error } = parseBody(confirmEmailBodySchema, request.body, reply)
    if (error) return

    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { id: true, email: true, pendingEmail: true, emailChangeCodeHash: true, emailChangeExpiresAt: true },
    })
    if (!user) throw new AppError('Usuário não encontrado', 404)
    const { pendingEmail, emailChangeCodeHash: codeHash, emailChangeExpiresAt: expiresAt } = user
    if (!pendingEmail || !codeHash || !expiresAt) {
      throw new AppError('Nenhuma troca de e-mail pendente', 400)
    }

    const invalidate = () =>
      prisma.user.update({ where: { id: user.id }, data: clearPendingEmail, select: { id: true } })

    if (expiresAt < new Date()) {
      await invalidate()
      throw new AppError('Código expirado. Solicite a troca de e-mail novamente.', 400)
    }

    // Conta a tentativa antes de comparar: atômico mesmo com requisições concorrentes
    const { emailChangeAttempts: attempts } = await prisma.user.update({
      where: { id: user.id },
      data: { emailChangeAttempts: { increment: 1 } },
      select: { emailChangeAttempts: true },
    })
    if (attempts > EMAIL_CODE_MAX_ATTEMPTS) {
      await invalidate()
      throw new AppError('Muitas tentativas. Solicite a troca de e-mail novamente.', 400)
    }

    if (!sameHash(hashEmailCode(user.id, body.code), codeHash)) {
      if (attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
        await invalidate()
        throw new AppError('Código incorreto. Limite de tentativas atingido; solicite a troca de e-mail novamente.', 400)
      }
      throw new AppError('Código incorreto', 400)
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Só efetiva se a pendência ainda for a mesma (evita dupla confirmação concorrente)
        const changed = await tx.user.updateMany({
          where: { id: user.id, pendingEmail, emailChangeCodeHash: codeHash },
          data: { email: pendingEmail, ...clearPendingEmail },
        })
        if (changed.count === 0) throw new AppError('Nenhuma troca de e-mail pendente', 400)
        await revokeAllUserTokens(user.id, tx)
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        await invalidate()
        throw new AppError('E-mail já cadastrado', 409)
      }
      throw err
    }

    const resend = getResend()
    if (resend) {
      try {
        await resend.emails.send({
          from: getEmailFrom(),
          to: user.email,
          subject: 'Seu e-mail de acesso foi alterado — CAPI',
          html: `
            <p>Seu e-mail de acesso foi alterado. A partir de agora, use o novo endereço para entrar na sua conta CAPI.</p>
            <p>Se você não reconhece essa alteração, entre em contato com o suporte imediatamente.</p>
          `.trim(),
        })
      } catch (err) {
        request.log.warn({ err }, '[email-change] falha ao avisar o e-mail antigo')
      }
    }

    auditLog(prisma, {
      actorType: 'USER',
      action: 'account.email_changed',
      targetType: 'USER',
      targetId: user.id,
      ipAddress: request.ip,
      metadata: { actorUserId: user.id },
    })

    return reply.send({ email: pendingEmail })
  })
}
