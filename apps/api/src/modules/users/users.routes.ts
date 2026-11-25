import { FastifyInstance } from 'fastify'
import { randomBytes, randomUUID } from 'node:crypto'
import { authenticate } from '../../shared/middlewares/authenticate'
import { AppError } from '../../shared/errors/AppError'
import prisma from '../../database'
import { revokeAllUserTokens } from '../auth/token.service'

const REMOVED_NAME = 'Usuário Removido'

/** Reservas do titular em QUALQUER tenant: vinculadas à conta ou feitas com o e-mail dele. */
function ownBookings(userId: string, email: string) {
  return { OR: [{ userId }, { customerEmail: email }] }
}

export async function usersRoutes(app: FastifyInstance) {
  // GET /tenants/:slug/users/me/export — LGPD direito de acesso (Art. 18, II)
  app.get(
    '/tenants/:slug/users/me/export',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user.sub

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          cpf: true,
          photoUrl: true,
          createdAt: true,
        },
      })
      if (!user) throw new AppError('Usuário não encontrado', 404)

      const [bookings, favorites, reviews] = await Promise.all([
        prisma.booking.findMany({
          where: ownBookings(user.id, user.email),
          select: {
            id: true,
            code: true,
            status: true,
            pax: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            createdAt: true,
            tenant: { select: { name: true, slug: true } },
            slot: { select: { startsAt: true, package: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.favorite.findMany({
          where: { userId },
          select: {
            id: true,
            createdAt: true,
            package: { select: { name: true } },
            destination: { select: { title: true } },
          },
        }),
        prisma.review.findMany({
          where: { booking: ownBookings(user.id, user.email) },
          select: { id: true, rating: true, comment: true, customerName: true, createdAt: true },
        }),
      ])

      return reply.status(200).send({ user, bookings, favorites, reviews })
    },
  )

  // DELETE /tenants/:slug/users/me — LGPD eliminação/anonimização (Art. 18, VI)
  // As reservas ficam (histórico transacional/fiscal), mas sem nenhum dado pessoal.
  app.delete('/tenants/:slug/users/me', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.sub

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    if (!existing) throw new AppError('Usuário não encontrado', 404)

    // Valor aleatório: um hash do e-mail seria reversível por dicionário
    const anonymizedEmail = `removido-${randomUUID()}@anonimo.invalid`
    const mine = ownBookings(userId, existing.email)

    await prisma.$transaction(async (tx) => {
      // Sessões ativas morrem junto com a conta (refresh token valia 30 dias)
      await revokeAllUserTokens(userId, tx)

      await tx.user.update({
        where: { id: userId },
        data: {
          name: REMOVED_NAME,
          email: anonymizedEmail,
          cpf: null,
          photoUrl: null,
          pendingEmail: null,
          emailChangeCodeHash: null,
          emailChangeExpiresAt: null,
          // Senha inutilizável (não é um hash bcrypt válido)
          password: `!removido:${randomBytes(32).toString('hex')}`,
        },
      })

      // Relações via booking primeiro (o filtro usa o e-mail original da reserva)
      await tx.review.updateMany({
        where: { booking: mine },
        data: { customerName: REMOVED_NAME, customerEmail: anonymizedEmail },
      })
      await tx.testimonial.updateMany({
        where: { booking: mine },
        data: { touristName: REMOVED_NAME },
      })
      await tx.booking.updateMany({
        where: mine,
        data: {
          customerName: REMOVED_NAME,
          customerEmail: anonymizedEmail,
          customerPhone: '',
          customerCpfHash: null,
        },
      })

      await tx.favorite.deleteMany({ where: { userId } })
      await tx.notification.deleteMany({ where: { userId } })
    })

    return reply.status(204).send()
  })
}
