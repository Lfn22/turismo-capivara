import { FastifyRequest, FastifyReply } from 'fastify'
import { Role } from '@prisma/client'

export function authorize(roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Não autenticado' })
    }

    const user = request.user as { role: Role }

    // PLATFORM_ADMIN tem o mesmo acesso do SUPER_ADMIN nas rotas que o aceitam
    const allowed =
      roles.includes(user.role) ||
      (user.role === 'PLATFORM_ADMIN' && roles.includes('SUPER_ADMIN'))

    if (!allowed) {
      return reply.status(403).send({ message: 'Acesso negado' })
    }
  }
}

// Exclusivo do SUPER_ADMIN (ex.: gerir admins da plataforma)
export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return reply.status(401).send({ message: 'Não autenticado' })
  }

  if ((request.user as { role: Role }).role !== 'SUPER_ADMIN') {
    return reply.status(403).send({ message: 'Acesso negado' })
  }
}
