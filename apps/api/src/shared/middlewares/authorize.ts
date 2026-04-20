import { FastifyRequest, FastifyReply } from 'fastify'
import { Role } from '@prisma/client'

export function authorize(roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Não autenticado' })
    }

    const user = request.user as { role: Role }

    if (!roles.includes(user.role)) {
      return reply.status(403).send({ message: 'Acesso negado' })
    }
  }
}
