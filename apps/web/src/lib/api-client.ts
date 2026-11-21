/**
 * Client-side authenticated API calls via /api/proxy.
 * Keeps the raw API JWT out of the browser — the proxy reads
 * it from the encrypted NextAuth cookie server-side.
 */

type FetchOptions = {
  method?: string
  body?: unknown
}

export async function apiClient<T = unknown>(
  path: string,
  opts?: FetchOptions,
): Promise<{ ok: boolean; status: number; data: T }> {
  const url = `/api/proxy?path=${encodeURIComponent(path)}`
  const res = await fetch(url, {
    method: opts?.method ?? 'GET',
    ...(opts?.body !== undefined
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(opts.body) }
      : {}),
  })

  if (res.status === 204) return { ok: true, status: 204, data: null as T }

  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data: data as T }
}
