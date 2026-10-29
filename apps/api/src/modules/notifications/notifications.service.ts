import prisma from '../../database'

export type NotifyInput = {
  userIds: string[]
  type: string
  title: string
  body: string
  link?: string | null
  groupKey?: string
  actionKey?: string
}

export async function notify(input: NotifyInput): Promise<void> {
  const userIds = [...new Set(input.userIds.filter(Boolean))]
  if (userIds.length === 0) return

  const { type, title, body, groupKey, actionKey } = input
  const link = input.link ?? null

  // Notificações acionáveis (actionKey) nunca agrupam: cada uma deve ser resolvida individualmente.
  if (!groupKey || actionKey) {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({ userId, type, title, body, link, actionKey })),
    })
    return
  }

  for (const userId of userIds) {
    const existing = await prisma.notification.findFirst({
      where: { userId, groupKey, readAt: null },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    })
    if (existing) {
      await prisma.notification.update({
        where: { id: existing.id },
        data: { count: { increment: 1 }, title, body, link, digestedAt: null },
      })
    } else {
      await prisma.notification.create({
        data: { userId, type, title, body, link, groupKey, actionKey },
      })
    }
  }
}

export async function resolveAction(actionKey: string, resolvedByName: string): Promise<void> {
  const now = new Date()
  await prisma.$transaction([
    prisma.notification.updateMany({
      where: { actionKey, resolvedAt: null },
      data: { resolvedAt: now, resolvedByName },
    }),
    prisma.notification.updateMany({
      where: { actionKey, readAt: null },
      data: { readAt: now },
    }),
  ])
}

export async function platformStaffIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'PLATFORM_ADMIN'] } },
    select: { id: true },
  })
  return users.map((u) => u.id)
}

export async function tenantAdminIds(tenantId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { tenantId, role: 'ADMIN' },
    select: { id: true },
  })
  return users.map((u) => u.id)
}
