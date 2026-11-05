import { describe, it, expect, vi } from "vitest"
import { apiTokenExpiresAt, needsRefresh, ensureFreshApiToken, REFRESH_MARGIN_MS } from "./api-token"

function jwtWithExp(expSeconds: number): string {
  const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: "u1", exp: expSeconds })}.sig`
}

const NOW = 1_800_000_000_000

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

describe("apiTokenExpiresAt", () => {
  it("lê o claim exp em ms", () => {
    expect(apiTokenExpiresAt(jwtWithExp(1_800_000_900), NOW)).toBe(1_800_000_900_000)
  })
  it("usa now + 14 min quando o token é ilegível", () => {
    expect(apiTokenExpiresAt("lixo", NOW)).toBe(NOW + 14 * 60_000)
  })
})

describe("needsRefresh", () => {
  it("false sem apiToken", () => {
    expect(needsRefresh({}, NOW)).toBe(false)
  })
  it("false quando falta mais que a margem", () => {
    expect(needsRefresh({ apiToken: "x", apiTokenExpires: NOW + REFRESH_MARGIN_MS + 1000 }, NOW)).toBe(false)
  })
  it("true dentro da margem e quando já expirou", () => {
    expect(needsRefresh({ apiToken: "x", apiTokenExpires: NOW + 30_000 }, NOW)).toBe(true)
    expect(needsRefresh({ apiToken: "x", apiTokenExpires: NOW - 1 }, NOW)).toBe(true)
  })
  it("sem apiTokenExpires, decodifica o exp do token", () => {
    expect(needsRefresh({ apiToken: jwtWithExp(NOW / 1000 + 30) }, NOW)).toBe(true)
    expect(needsRefresh({ apiToken: jwtWithExp(NOW / 1000 + 600) }, NOW)).toBe(false)
  })
})

describe("ensureFreshApiToken", () => {
  const expiring = { apiToken: "old", refreshToken: "r1", apiTokenExpires: NOW + 10_000, role: "ADMIN" }

  it("não chama a API quando o token está válido", async () => {
    const fetchImpl = vi.fn()
    const t = { ...expiring, apiTokenExpires: NOW + 10 * 60_000 }
    const r = await ensureFreshApiToken(t, fetchImpl as unknown as typeof fetch, NOW)
    expect(r).toEqual({ status: "ok", token: t })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("renova e preserva os demais campos", async () => {
    const newAccess = jwtWithExp(NOW / 1000 + 900)
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { token: newAccess, refreshToken: "r2" }))
    const r = await ensureFreshApiToken(expiring, fetchImpl as unknown as typeof fetch, NOW)
    expect(r.status).toBe("refreshed")
    expect(r.token).toEqual({ apiToken: newAccess, refreshToken: "r2", apiTokenExpires: NOW + 900_000, role: "ADMIN" })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(String(url)).toMatch(/\/auth\/refresh$/)
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({ refreshToken: "r1" })
  })

  it("401 → invalid", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(401, { message: "Token inválido ou expirado" }))
    const r = await ensureFreshApiToken(expiring, fetchImpl as unknown as typeof fetch, NOW)
    expect(r.status).toBe("invalid")
  })

  it("erro de rede ou 5xx → mantém o token (falha transitória)", async () => {
    const down = vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    expect((await ensureFreshApiToken(expiring, down as unknown as typeof fetch, NOW)).status).toBe("ok")
    const err500 = vi.fn().mockResolvedValue(jsonResponse(500, {}))
    const r = await ensureFreshApiToken(expiring, err500 as unknown as typeof fetch, NOW)
    expect(r).toEqual({ status: "ok", token: expiring })
  })

  it("sessão antiga sem refresh token: invalid só depois de expirar", async () => {
    const fetchImpl = vi.fn()
    const legacy = { apiToken: "old", apiTokenExpires: NOW + 10_000 }
    expect((await ensureFreshApiToken(legacy, fetchImpl as unknown as typeof fetch, NOW)).status).toBe("ok")
    expect((await ensureFreshApiToken({ ...legacy, apiTokenExpires: NOW - 1 }, fetchImpl as unknown as typeof fetch, NOW)).status).toBe("invalid")
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
