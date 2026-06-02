import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import { randomBytes, createHash } from 'crypto'
import prisma from '../../../database'
import { getResend } from '../../../shared/email'

const bodySchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
})

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function requestPasswordResetRoute(app: FastifyInstance) {
  app.post(
    '/auth/request-password-reset',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      let body
      try {
        body = bodySchema.parse(request.body)
      } catch (err) {
        if (err instanceof ZodError) {
          return reply.status(400).send({
            message: 'Dados inválidos',
            errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
          })
        }
        throw err
      }

      const email = body.email.toLowerCase()

      // Always respond with same message — no user enumeration
      const genericResponse = {
        message: 'Se este email estiver cadastrado, você receberá um link para redefinir sua senha.',
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, tenant: { select: { slug: true } } },
      })

      if (!user) {
        return reply.status(200).send(genericResponse)
      }

      // Generate a cryptographically secure token
      const rawToken = randomBytes(32).toString('hex')
      const hashedToken = hashToken(rawToken)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          hashedToken,
          expiresAt,
        },
      })

      const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
      const resetLink = `${appUrl}/reset-password?token=${rawToken}`

      const resend = getResend()
      if (resend) {
        const fromEmail = process.env.EMAIL_FROM ?? 'noreply@turismocapivara.com.br'
        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: 'Redefinição de senha — CAPI',
          html: `
            <p>Olá, ${user.name}!</p>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
            <p>Clique no link abaixo para redefinir sua senha (válido por 1 hora):</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
            <p>Se você não solicitou a redefinição de senha, ignore este email.</p>
          `.trim(),
        })
      } else {
        // Dev fallback: log reset link to console
        console.log(`[password-reset] Reset link for ${email}: ${resetLink}`)
      }

      return reply.status(200).send(genericResponse)
    }
  )
}
