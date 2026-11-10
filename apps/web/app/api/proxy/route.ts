import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3333"

/**
 * Generic proxy route — forwards authenticated API calls server-side.
 * Client components call /api/proxy?path=/tenants/x/... instead of the API directly.
 * This keeps the raw API JWT out of the browser session.
 *
 * Usage:
 *   GET  /api/proxy?path=/tenants/:slug/guides/me/bookings
 *   POST /api/proxy?path=/tenants/:slug/packages/:id/slots   (body forwarded)
 *   PATCH /api/proxy?path=/tenants/:slug/bookings/:id/confirm
 */

async function handler(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const rawPath = searchParams.get("path")

  // Normaliza o path para eliminar sequências de path traversal (/../)
  let path: string
  let search: string
  try {
    const normalized = new URL(rawPath ?? "", "http://internal")
    path = normalized.pathname
    search = normalized.search
  } catch {
    return NextResponse.json({ message: "Parâmetro 'path' inválido" }, { status: 400 })
  }

  const ALLOWED_PATH =
    /^\/(tenants\/[^/\s]+\/|notifications(\/|$)|guides\/me(\/|$)|platform\/guides$|platform\/guides\/[^/]+(\/(approve|reject))?$|account\/(me|password|email|email\/confirm)$|affiliations\/[^/]+\/(accept|reject)$|packages\/[^/]+\/(membership|guides\/me|guide-requests\/[^/]+\/(accept|reject))$|destinations\/[^/]+\/(membership|guides\/me)$|edit\/(scope|destinations(\/[^/]+(\/packages)?)?)$)/
  if (!rawPath || !ALLOWED_PATH.test(path)) {
    return NextResponse.json({ message: "Parâmetro 'path' inválido" }, { status: 400 })
  }

  const upstream = `${API_URL}${path}${search}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwt.apiToken}`,
    "Content-Type": "application/json",
  }

  let body: string | undefined
  if (req.method !== "GET" && req.method !== "HEAD") {
    const text = await req.text()
    if (text) body = text
  }

  if (body === undefined) {
    delete headers["Content-Type"]
  }

  let res: Response
  try {
    res = await fetch(upstream, {
      method: req.method,
      headers,
      ...(body !== undefined ? { body } : {}),
      cache: "no-store",
    })
  } catch {
    return NextResponse.json({ message: "Serviço indisponível" }, { status: 502 })
  }

  // Entrar/sair de roteiro ou destino, slots etc. mudam as páginas públicas do destino
  if (req.method !== "GET" && res.ok && /\/(packages|destinations)(\/|$)/.test(path)) {
    revalidatePath("/destinos/[destination-slug]", "layout")
  }

  if (req.method !== "GET" && res.ok) {
    // Nome/foto/bio do guia aparecem nas páginas públicas em cache (destinos/*/guias, roteiros da operadora)
    if (/^\/account\/me$|^\/platform\/guides\/[^/]+$|^\/tenants\/[^/]+\/guides\/me\/profile$/.test(path)) {
      revalidatePath("/destinos/[destination-slug]", "layout")
      revalidatePath("/[slug]", "layout")
    }
    // Nome/logo da operadora: roteiros públicos da operadora e cards nos destinos
    if (/^\/tenants\/[^/]+\/(settings|admin-settings)$/.test(path)) {
      revalidatePath("/[slug]", "layout")
      revalidatePath("/destinos/[destination-slug]", "layout")
    }
  }

  // 204/205/304 não podem ter corpo: o construtor de Response rejeita até string vazia
  const data = [204, 205, 304].includes(res.status) ? null : await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  })
}

export const GET = handler
export const POST = handler
export const PATCH = handler
export const PUT = handler
export const DELETE = handler
