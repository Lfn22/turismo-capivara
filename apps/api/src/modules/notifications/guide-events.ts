import type { FastifyBaseLogger } from 'fastify'
import prisma from '../../database'
import { notify, platformStaffIds, resolveAction, tenantAdminIds } from './notifications.service'

const FAIL_MSG = '[notif] Falha ao notificar evento de guia'

/** Avisa a equipe da plataforma que há guia aguardando verificação. Nunca lança. */
export async function notifyGuideRegistered(log: FastifyBaseLogger, guideUserId: string): Promise<void> {
  try {
    const guide = await prisma.user.findUnique({
      where: { id: guideUserId },
      select: { id: true, name: true },
    })
    if (!guide) return

    await notify({
      userIds: await platformStaffIds(),
      type: 'guide.registered',
      title: 'Guia aguardando verificação',
      body: `${guide.name} enviou cadastro`,
      groupKey: 'guide.registered',
      actionKey: `guide-verification:${guide.id}`,
      link: '/super-admin/guias',
    })
  } catch (err) {
    log.warn({ err, guideUserId }, FAIL_MSG)
  }
}

/** Avisa os ADMINs da agência/associação declarada que um guia quer se vincular. Nunca lança. */
export async function notifyAffiliationRequested(log: FastifyBaseLogger, affiliationId: string): Promise<void> {
  try {
    const affiliation = await prisma.guideAffiliation.findUnique({
      where: { id: affiliationId },
      select: {
        id: true,
        tenantId: true,
        tenant: { select: { name: true, slug: true } },
        guide: { select: { user: { select: { name: true } } } },
      },
    })
    if (!affiliation) return

    await notify({
      userIds: await tenantAdminIds(affiliation.tenantId),
      type: 'guide.affiliation-requested',
      title: 'Guia quer se vincular à sua agência',
      body: `${affiliation.guide.user.name} declarou atuar com ${affiliation.tenant.name}`,
      groupKey: 'guide.affiliation-requested',
      actionKey: `guide-affiliation:${affiliation.id}`,
      link: `/${affiliation.tenant.slug}/admin/guias`,
    })
  } catch (err) {
    log.warn({ err, affiliationId }, FAIL_MSG)
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
          link: `/${guide.tenant.slug}/painel/perfil`,
        }
      : {
          type: 'guide.rejected',
          title: 'Cadastro recusado',
          body: `Motivo: ${decision.reason}`,
          link: '/guia/status',
        }
    await notify({ userIds: [guideUserId], ...content })
  } catch (err) {
    log.warn({ err, guideUserId }, FAIL_MSG)
  }
}

/** Resolve a pendência do vínculo e avisa o guia da decisão, conforme o status atual. Nunca lança. */
export async function notifyAffiliationDecision(
  log: FastifyBaseLogger,
  affiliationId: string,
  deciderUserId: string,
): Promise<void> {
  try {
    const [affiliation, decider] = await Promise.all([
      prisma.guideAffiliation.findUnique({
        where: { id: affiliationId },
        select: {
          status: true,
          rejectionReason: true,
          tenant: { select: { name: true } },
          guide: { select: { userId: true } },
        },
      }),
      prisma.user.findUnique({ where: { id: deciderUserId }, select: { name: true } }),
    ])
    if (!affiliation || affiliation.status === 'PENDING') return

    await resolveAction(`guide-affiliation:${affiliationId}`, decider?.name ?? 'Admin')

    const content =
      affiliation.status === 'ACCEPTED'
        ? {
            type: 'guide.affiliation-accepted',
            title: 'Vínculo confirmado',
            body: `${affiliation.tenant.name} confirmou seu vínculo. Entre de novo para ver o painel da agência.`,
          }
        : {
            type: 'guide.affiliation-rejected',
            title: 'Vínculo não confirmado',
            body: `${affiliation.tenant.name}: ${affiliation.rejectionReason ?? ''}`,
          }
    await notify({ userIds: [affiliation.guide.userId], ...content, link: '/guia/status' })
  } catch (err) {
    log.warn({ err, affiliationId }, FAIL_MSG)
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

/** Avisa ADMINs do tenant do guia (exceto `independente`) que ele entrou/saiu de um destino. Nunca lança. */
export async function notifyDestinationMembership(
  log: FastifyBaseLogger,
  guideUserId: string,
  destinationId: string,
  kind: 'joined' | 'left',
): Promise<void> {
  try {
    const [guide, destination] = await Promise.all([
      prisma.user.findUnique({
        where: { id: guideUserId },
        select: { name: true, tenantId: true, tenant: { select: { slug: true } } },
      }),
      prisma.destination.findUnique({
        where: { id: destinationId },
        select: { title: true, slug: true },
      }),
    ])
    if (!guide || !destination) return
    if (guide.tenant.slug === 'independente') return

    const adminIds = (await tenantAdminIds(guide.tenantId)).filter((id) => id !== guideUserId)
    await notify({
      userIds: adminIds,
      type: kind === 'joined' ? 'destination.guide-joined' : 'destination.guide-left',
      title:
        kind === 'joined'
          ? `Guia passou a atuar em ${destination.title}`
          : `Guia deixou de atuar em ${destination.title}`,
      body: guide.name,
      link: `/destinos/${destination.slug}`,
    })
  } catch (err) {
    log.warn({ err, guideUserId, destinationId, kind }, FAIL_MSG)
  }
}

/** Avisa quem decide (ADMINs do tenant do roteiro, ou o condutor se `independente`) e a equipe que um guia pediu para atuar. Nunca lança. */
export async function notifyPackageRequest(log: FastifyBaseLogger, packageGuideId: string): Promise<void> {
  try {
    const pg = await prisma.packageGuide.findUnique({
      where: { id: packageGuideId },
      select: {
        id: true,
        packageId: true,
        guide: { select: { userId: true, user: { select: { name: true } } } },
        package: {
          select: { name: true, tenantId: true, conductorId: true, tenant: { select: { slug: true } } },
        },
      },
    })
    if (!pg) return

    const deciderIds =
      pg.package.tenant.slug === 'independente'
        ? pg.package.conductorId
          ? [pg.package.conductorId]
          : []
        : await tenantAdminIds(pg.package.tenantId)
    const userIds = [...new Set([...deciderIds, ...(await platformStaffIds())])].filter(
      (id) => id !== pg.guide.userId,
    )

    await notify({
      userIds,
      type: 'package.guide-requested',
      title: 'Pedido para atuar em roteiro',
      body: `${pg.guide.user.name} · ${pg.package.name}`,
      groupKey: 'package.guide-requested',
      actionKey: `package-request:${pg.id}`,
      link: `/pendencias?package=${pg.packageId}`,
    })
  } catch (err) {
    log.warn({ err, packageGuideId }, FAIL_MSG)
  }
}

/** Resolve a pendência do pedido de roteiro e avisa o guia da decisão, conforme o status atual. Nunca lança. */
export async function notifyPackageDecision(
  log: FastifyBaseLogger,
  packageGuideId: string,
  deciderUserId: string,
): Promise<void> {
  try {
    const [pg, decider] = await Promise.all([
      prisma.packageGuide.findUnique({
        where: { id: packageGuideId },
        select: {
          status: true,
          rejectionReason: true,
          package: { select: { name: true } },
          guide: { select: { userId: true, user: { select: { tenant: { select: { slug: true } } } } } },
        },
      }),
      prisma.user.findUnique({ where: { id: deciderUserId }, select: { name: true } }),
    ])
    if (!pg || (pg.status !== 'ACCEPTED' && pg.status !== 'REJECTED')) return

    await resolveAction(`package-request:${packageGuideId}`, decider?.name ?? 'Admin')

    const content =
      pg.status === 'ACCEPTED'
        ? {
            type: 'package.request-accepted',
            title: 'Pedido aceito',
            body: `Você agora atua em ${pg.package.name}`,
          }
        : {
            type: 'package.request-rejected',
            title: 'Pedido recusado',
            body: `${pg.package.name}: ${pg.rejectionReason ?? ''}`,
          }
    await notify({
      userIds: [pg.guide.userId],
      ...content,
      link: `/${pg.guide.user.tenant.slug}/painel/perfil`,
    })
  } catch (err) {
    log.warn({ err, packageGuideId }, FAIL_MSG)
  }
}

/** Avisa ADMINs do tenant do roteiro (exceto o próprio guia) que o guia saiu. Nunca lança. */
export async function notifyPackageLeft(log: FastifyBaseLogger, packageGuideId: string): Promise<void> {
  try {
    const pg = await prisma.packageGuide.findUnique({
      where: { id: packageGuideId },
      select: {
        packageId: true,
        guide: { select: { userId: true, user: { select: { name: true } } } },
        package: { select: { name: true, tenantId: true, tenant: { select: { slug: true } } } },
      },
    })
    if (!pg) return

    const adminIds = (await tenantAdminIds(pg.package.tenantId)).filter((id) => id !== pg.guide.userId)
    await notify({
      userIds: adminIds,
      type: 'package.guide-left',
      title: 'Guia saiu do roteiro',
      body: `${pg.guide.user.name} · ${pg.package.name}`,
      link: `/${pg.package.tenant.slug}/painel/roteiros/${pg.packageId}`,
    })
  } catch (err) {
    log.warn({ err, packageGuideId }, FAIL_MSG)
  }
}
