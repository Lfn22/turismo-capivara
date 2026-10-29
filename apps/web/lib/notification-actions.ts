export type RejectInput =
  | { reasonCode: "ILEGIVEL" | "VENCIDO" | "NOME_DIFERENTE" | "OUTRO"; text?: string }
  | { reason: string }

export type NotificationAction = {
  approve: () => Promise<void>
  reject: (input: RejectInput) => Promise<void>
  rejectKind: "guide-codes" | "free-text"
}

export class AlreadyDecidedError extends Error {
  constructor() {
    super("Este pedido já foi decidido.")
  }
}

export async function patchViaProxy(path: string, body?: unknown): Promise<void> {
  const res = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, {
    method: "PATCH",
    cache: "no-store",
    ...(body !== undefined
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  })
  if (res.status === 409) throw new AlreadyDecidedError()
  if (!res.ok) {
    let message = "Não foi possível concluir a ação."
    try {
      const data = await res.json()
      if (typeof data?.message === "string") message = data.message
    } catch {
      // mantém a mensagem padrão
    }
    throw new Error(message)
  }
}

function make(base: string, rejectKind: NotificationAction["rejectKind"], approveSuffix: string): NotificationAction {
  return {
    rejectKind,
    approve: () => patchViaProxy(`${base}/${approveSuffix}`),
    reject: (input) => patchViaProxy(`${base}/reject`, input),
  }
}

export function actionFor(actionKey: string, link: string | null): NotificationAction | null {
  const i = actionKey.indexOf(":")
  if (i < 0) return null
  const prefix = actionKey.slice(0, i)
  const id = actionKey.slice(i + 1)
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return null
  if (prefix === "guide-verification") {
    return make(`/platform/guides/${id}`, "guide-codes", "approve")
  }
  if (prefix === "guide-affiliation") {
    return make(`/affiliations/${id}`, "free-text", "accept")
  }
  if (prefix === "package-request") {
    let packageId: string | null = null
    try {
      packageId = new URL(link ?? "", "http://internal").searchParams.get("package")
    } catch {
      return null
    }
    if (!packageId || !/^[A-Za-z0-9_-]+$/.test(packageId)) return null
    return make(`/packages/${packageId}/guide-requests/${id}`, "free-text", "accept")
  }
  return null
}
