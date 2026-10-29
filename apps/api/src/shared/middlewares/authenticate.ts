import { FastifyRequest, FastifyReply } from 'fastify'
import prisma from '../../database'
import { AppError } from '../errors/AppError'
import { isPlatformStaff } from '../auth/roles'

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ message: 'Token inválido ou expirado' })
  }

  // Staff tokens are revalidated against the DB so a removed/demoted admin loses access immediately
  if (isPlatformStaff(request.user.role)) {
    const user = await prisma.user.findUnique({ where: { id: request.user.sub }, select: { role: true } })
    if (!user || user.role !== request.user.role) {
      return reply.status(401).send({ message: 'Token inválido ou expirado' })
    }
  }

  // Cross-tenant ownership check (D-08, D-09)
  // Only applies when the route has a :slug param.
  // Compare JWT.tenantId with the id of the tenant resolved from the URL slug.
  const { slug } = (request.params as Record<string, string | undefined>)
  if (slug) {
    const tenant = await prisma.tenant.findUnique({ where: { slug } })

    if (!tenant) {
      throw new AppError('Tenant não encontrado', 404)
    }

    if (!isPlatformStaff(request.user.role) && request.user.tenantId !== tenant.id) {
      throw new AppError('Acesso negado a este tenant', 403)
    }
  }
}
