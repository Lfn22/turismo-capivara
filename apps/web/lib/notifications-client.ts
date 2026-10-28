export type NotificationDTO = {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  count: number
  readAt: string | null
  actionKey: string | null
  resolvedAt: string | null
  resolvedByName: string | null
  updatedAt: string
}

async function call(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, {
    cache: "no-store",
    ...init,
  })
  if (!res.ok) throw new Error(`Falha ao acessar notificações (${res.status})`)
  return res
}

export async function fetchSummary(): Promise<{ unread: number; pending: number }> {
  return (await call("/notifications/summary")).json()
}

export async function fetchNotifications(
  cursor?: string,
): Promise<{ notifications: NotificationDTO[]; nextCursor: string | null }> {
  const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""
  return (await call(`/notifications${q}`)).json()
}

export async function fetchPending(): Promise<{ notifications: NotificationDTO[] }> {
  return (await call("/notifications/pending")).json()
}

export async function markRead(id: string): Promise<void> {
  await call(`/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" })
}

export async function markAllRead(): Promise<void> {
  await call("/notifications/read-all", { method: "POST" })
}
