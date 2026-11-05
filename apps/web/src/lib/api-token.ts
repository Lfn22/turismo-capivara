// Renovação do token de acesso da API (JWT de 15 min) usando o refresh token rotativo.
// Usado no middleware (Edge) e no callback jwt do next-auth — só APIs web padrão (fetch, atob).

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

/** Renova quando faltar menos que isto para expirar. */
export const REFRESH_MARGIN_MS = 60_000
/** Validade assumida quando o token não traz `exp` legível (API emite 15 min). */
const FALLBACK_TTL_MS = 14 * 60_000

export type ApiTokenFields = {
  apiToken?: string
  refreshToken?: string
  /** Epoch em ms. */
  apiTokenExpires?: number
}

/** Lê o claim `exp` do JWT da API sem verificar assinatura (só para agendar a renovação). */
export function apiTokenExpiresAt(apiToken: string, now = Date.now()): number {
  try {
    const part = apiToken.split(".")[1]
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/")
    const payload = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "=")))
    if (typeof payload?.exp === "number") return payload.exp * 1000
  } catch {
    // formato inesperado: usa o fallback
  }
  return now + FALLBACK_TTL_MS
}

function expiresAt(t: ApiTokenFields, now: number): number {
  return t.apiTokenExpires ?? apiTokenExpiresAt(t.apiToken ?? "", now)
}

export function needsRefresh(t: ApiTokenFields, now = Date.now()): boolean {
  if (!t.apiToken) return false
  return expiresAt(t, now) - now <= REFRESH_MARGIN_MS
}

export type RefreshResult =
  | { ok: true; apiToken: string; refreshToken: string; apiTokenExpires: number }
  /** fatal = refresh token rejeitado (sessão morta); senão falha transitória (rede/5xx). */
  | { ok: false; fatal: boolean }

export async function refreshApiToken(refreshToken: string, fetchImpl: typeof fetch = fetch): Promise<RefreshResult> {
  let res: Response
  try {
    res = await fetchImpl(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    })
  } catch {
    return { ok: false, fatal: false }
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) return { ok: false, fatal: true }
  if (!res.ok) return { ok: false, fatal: false }
  const data = await res.json().catch(() => null)
  if (typeof data?.token !== "string" || typeof data?.refreshToken !== "string") return { ok: false, fatal: false }
  return { ok: true, apiToken: data.token, refreshToken: data.refreshToken, apiTokenExpires: apiTokenExpiresAt(data.token) }
}

/**
 * - "ok": token ainda válido (ou falha transitória — tenta de novo no próximo request)
 * - "refreshed": `token` traz o par novo; quem chamou deve persistir o cookie
 * - "invalid": refresh rejeitado ou token expirado sem refresh token → encerrar a sessão
 */
export type EnsureResult<T> = { status: "ok" | "refreshed" | "invalid"; token: T }

export async function ensureFreshApiToken<T extends ApiTokenFields>(
  token: T,
  fetchImpl: typeof fetch = fetch,
  now = Date.now(),
): Promise<EnsureResult<T>> {
  if (!needsRefresh(token, now)) return { status: "ok", token }
  if (!token.refreshToken) {
    // Sessão antiga (antes do refresh token): sem como renovar
    return { status: expiresAt(token, now) <= now ? "invalid" : "ok", token }
  }
  const r = await refreshApiToken(token.refreshToken, fetchImpl)
  if (r.ok) {
    return {
      status: "refreshed",
      token: { ...token, apiToken: r.apiToken, refreshToken: r.refreshToken, apiTokenExpires: r.apiTokenExpires },
    }
  }
  return { status: r.fatal ? "invalid" : "ok", token }
}
