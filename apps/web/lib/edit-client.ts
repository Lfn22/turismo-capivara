export type EditScope = {
  destinations: "ALL" | string[]
  packages: "ALL" | { tenantId: string; tenantSlug: string } | { conductorId: string }
  canManageDestinations: boolean
  label: string
}

export async function fetchEditScope(): Promise<EditScope | null> {
  const res = await fetch(`/api/proxy?path=${encodeURIComponent("/edit/scope")}`, { cache: "no-store" })
  if (!res.ok) return null
  return res.json()
}

export async function editCall(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    cache: "no-store",
    ...(body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  })
  let data: any = null // eslint-disable-line @typescript-eslint/no-explicit-any
  try { data = await res.json() } catch { data = null }
  return { ok: res.ok, status: res.status, data }
}

export function errorText(data: any, fallback: string): string { // eslint-disable-line @typescript-eslint/no-explicit-any
  const list = Array.isArray(data?.errors) ? data.errors.map((e: { message: string }) => e.message) : []
  return list.length ? list.join(" ") : (data?.message ?? fallback)
}
