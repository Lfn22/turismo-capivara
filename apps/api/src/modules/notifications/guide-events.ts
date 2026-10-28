import type { FastifyBaseLogger } from 'fastify'
import prisma from '../../database'
import { notify, platformStaffIds, resolveAction, tenantAdminIds } from './notifications.service'

const FAIL_MSG = '[notif] Falha ao notificar evento de guia'

/** Avisa staff da plataforma e ADMINs do tenant que há guia aguardando verificação. Nunca lança. */
export async function notifyGuideRegistered(log: FastifyBaseLogger, guideUserId: string): Promise<void> {
  try {
    const guide = await prisma.user.findUnique({
      where: { id: guideUserId },
      select: { id: true, name: true, tenantId: true, tenant: { select: { slug: true } } },
    })
    if (!guide) return

    const base = {
      type: 'guide.registered',
      title: 'Guia aguardando verificação',
      body: `${guide.name} enviou cadastro`,
      groupKey: 'guide.registered',
      actionKey: `guide-verification:${guide.id}`,
    }
    await notify({ userIds: await platformStaffIds(), ...base, link: '/pendencias' })
    await notify({
      userIds: await tenantAdminIds(guide.tenantId),
      ...base,
      link: `/${guide.tenant.slug}/admin/guias`,
    })
  } catch (err) {
    log.warn({ err, guideUserId }, FAIL_MSG)
  }
}

/** Resolve a pendência de verificação e avisa o guia da decisão. Nunca lança. */
export async function notifyGuideDecision(
  log: FastifyBaseLogger,
  guideUserId: string,
  decision: { approved: true } | { approved: false; reason: string },
  deciderUserId: string,
): Promise<void> {
  try {
    const decider = await prisma.user.findUnique({
      where: { id: deciderUserId },
      select: { name: true },
    })
    await resolveAction(`guide-verification:${guideUserId}`, decider?.name ?? 'Admin')

    const guide = await prisma.user.findUnique({
      where: { id: guideUserId },
      select: { tenant: { select: { slug: true } } },
    })
    if (!guide) return

    const content = decision.approved
      ? {
          type: 'guide.approved',
          title: 'Cadastro aprovado',
          body: 'Seu perfil já pode aparecer no site.',
        }
      : {
          type: 'guide.rejected',
          title: 'Cadastro recusado',
          body: `Motivo: ${decision.reason}`,
        }
    await notify({ userIds: [guideUserId], ...content, link: `/${guide.tenant.slug}/painel/perfil` })
  } catch (err) {
    log.warn({ err, guideUserId }, FAIL_MSG)
  }
}

/** Avisa ADMINs do tenant do roteiro (exceto o próprio guia) que um guia entrou. Nunca lança. */
export async function notifyGuideJoinedPackage(
  log: FastifyBaseLogger,
  guideUserId: string,
  packageId: string,
): Promise<void> {
  try {
    const [guide, pkg] = await Promise.all([
      prisma.user.findUnique({ where: { id: guideUserId }, select: { name: true } }),
      prisma.tourPackage.findUnique({
        where: { id: packageId },
        select: { name: true, tenantId: true, tenant: { select: { slug: true } } },
      }),
    ])
    if (!guide || !pkg) return

    const adminIds = (await tenantAdminIds(pkg.tenantId)).filter((id) => id !== guideUserId)
    await notify({
      userIds: adminIds,
      type: 'package.guide-joined',
      title: 'Guia entrou no roteiro',
      body: `${guide.name} · ${pkg.name}`,
      link: `/${pkg.tenant.slug}/painel/roteiros/${packageId}`,
    })
  } catch (err) {
    log.warn({ err, guideUserId, packageId }, FAIL_MSG)
  }
}
