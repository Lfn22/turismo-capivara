import { FastifyInstance } from 'fastify'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'

const STATE = { PENDING: 'PENDING', REJECTED: 'REJECTED', ACCEPTED: 'IN' } as const

export async function myMembershipsRoutes(app: FastifyInstance) {
  // GET /guides/me/memberships — destinos e roteiros em que o guia atua ou pediu para atuar
  app.get('/guides/me/memberships', {
    preHandler: [authenticate, authorize(['CONDUTOR'])],
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const profile = await prisma.guideProfile.findUnique({ where: { userId: sub }, select: { id: true } })
    if (!profile) throw new AppError('Guia não encontrado', 404)

    const [destinations, packageGuides] = await Promise.all([
      prisma.guideDestination.findMany({
        where: { guideId: profile.id },
        select: { destination: { select: { slug: true, title: true } } },
      }),
      prisma.packageGuide.findMany({
        where: { guideId: profile.id, status: { in: ['PENDING', 'REJECTED', 'ACCEPTED'] } },
        select: {
          status: true,
          rejectionReason: true,
          package: {
            select: { id: true, name: true, tenant: { select: { destination: { select: { slug: true } } } } },
          },
        },
      }),
    ])

    return reply.send({
      destinations: destinations.map((d) => ({ slug: d.destination.slug, title: d.destination.title })),
      packages: packageGuides.map((pg) => ({
        id: pg.package.id,
        name: pg.package.name,
        destinationSlug: pg.package.tenant.destination?.slug ?? null,
        state: STATE[pg.status as keyof typeof STATE],
        rejectionReason: pg.rejectionReason ?? null,
      })),
    })
  })
}
