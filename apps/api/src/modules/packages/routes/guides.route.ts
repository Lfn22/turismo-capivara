import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../database'
import { AppError } from '../../../shared/errors/AppError'
import { authenticate } from '../../../shared/middlewares/authenticate'
import { authorize } from '../../../shared/middlewares/authorize'
import { Role } from '@prisma/client'
import { parseParams } from '../../../shared/utils/zod-error'

const slugAndIdParamsSchema = z.object({
  slug: z.string().min(1, { message: 'Slug obrigatório' }),
  id: z.string().min(1, { message: 'ID obrigatório' }),
})

export async function guidesRoute(app: FastifyInstance) {
  // POST /tenants/:slug/packages/:id/guides/me — condutor se vincula ao próprio roteiro
  app.post('/tenants/:slug/packages/:id/guides/me', {
    preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN])],
  }, async (request, reply) => {
    const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
    if (error) return

    const user = request.user as { sub: string; role: string }

    const guideProfile = await prisma.guideProfile.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    })
    if (!guideProfile) throw new AppError('Perfil de guia não encontrado', 404)

    const pkg = await prisma.tourPackage.findFirst({
      where: { id: params!.id, tenantId: { not: undefined } },
      select: { id: true },
    })
    if (!pkg) throw new AppError('Roteiro não encontrado', 404)

    await prisma.packageGuide.upsert({
      where: { packageId_guideId: { packageId: params!.id, guideId: guideProfile.id } },
      create: { packageId: params!.id, guideId: guideProfile.id, active: true },
      update: { active: true },
    })

    return reply.status(200).send({ message: 'Guia vinculado ao roteiro com sucesso' })
  })
}
