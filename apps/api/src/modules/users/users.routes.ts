import { FastifyInstance } from 'fastify'
import { createHash } from 'node:crypto'
import { authenticate } from '../../shared/middlewares/authenticate'
import { AppError } from '../../shared/errors/AppError'
import prisma from '../../database'

export async function usersRoutes(app: FastifyInstance) {
  // GET /tenants/:slug/users/me/export — LGPD right of access (Art. 18)
  app.get(
    '/tenants/:slug/users/me/export',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user.sub

      // Look up the user to get their email (JWT payload has no email field)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      })
      if (!user) throw new AppError('Usuário não encontrado', 404)

      // Query bookings by customerEmail — Booking has no userId field
      const bookings = await prisma.booking.findMany({
        where: { customerEmail: user.email, tenantId: request.user.tenantId },
        select: { id: true, slotId: true, status: true, createdAt: true },
      })

      return reply.status(200).send({ user, bookings })
    }
  )

  // DELETE /tenants/:slug/users/me — LGPD right of erasure/anonymization (Art. 18-19)
  // Booking records are preserved (transactional history) — only user PII is anonymized
  app.delete(
    '/tenants/:slug/users/me',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user.sub

      // Fetch current email first (needed to hash it; JWT payload has no email)
      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      })
      if (!existing) throw new AppError('Usuário não encontrado', 404)

      const salt = process.env.ANONYMIZATION_SALT
      if (!salt) throw new AppError('Configuração de anonimização ausente', 500)
      const anonymizedEmail = createHash('sha256')
        .update(existing.email + salt)
        .digest('hex')

      // Anonymize user PII and matching customerEmail in bookings within a single transaction
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            name: 'Usuário Removido',
            email: anonymizedEmail,
          },
        })

        await tx.booking.updateMany({
          where: { customerEmail: existing.email, tenantId: request.user.tenantId },
          data: { customerEmail: anonymizedEmail },
        })
      })

      return reply.status(204).send()
    }
  )
}
