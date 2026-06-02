import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import { createHash } from 'crypto'
import { hashSync } from 'bcryptjs'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'

const bodySchema = z.object({
  token: z.string().min(1, { message: 'Token obrigatório' }),
  newPassword: z.string().min(8, { message: 'Senha deve ter no mínimo 8 caracteres' }),
})

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function resetPasswordRoute(app: FastifyInstance) {
  app.put(
    '/auth/reset-password',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
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

      const hashedToken = hashToken(body.token)

      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { hashedToken },
        select: { id: true, userId: true, expiresAt: true, usedAt: true },
      })

      if (!resetToken) {
        throw new AppError('Token inválido ou expirado', 400)
      }

      if (resetToken.usedAt) {
        throw new AppError('Token já utilizado', 400)
      }

      if (resetToken.expiresAt < new Date()) {
        throw new AppError('Token inválido ou expirado', 400)
      }

      const hashedPassword = hashSync(body.newPassword, 10)

      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { password: hashedPassword },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() },
        }),
      ])

      return reply.status(200).send({ message: 'Senha redefinida com sucesso' })
    }
  )
}
