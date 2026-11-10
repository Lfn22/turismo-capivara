import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const ID_RE = /^[a-z0-9-]+$/i
const ACTIONS = ["create", "update", "publish", "unpublish", "archive", "restore"] as const
type Action = (typeof ACTIONS)[number]

const validId = (v: unknown): v is string => typeof v === "string" && v.length <= 64 && ID_RE.test(v)

export async function POST(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }

  let body: { action?: unknown; tenantSlug?: unknown; packageId?: unknown; data?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: "Corpo inválido" }, { status: 400 })
  }

  const { action, tenantSlug, packageId, data } = body
  if (typeof action !== "string" || !(ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json({ message: "Ação inválida" }, { status: 400 })
  }
  if (!validId(tenantSlug)) {
    return NextResponse.json({ message: "Agência inválida" }, { status: 400 })
  }
  if (action !== "create" && !validId(packageId)) {
    return NextResponse.json({ message: "Roteiro inválido" }, { status: 400 })
  }

  const base = `/tenants/${encodeURIComponent(tenantSlug)}/packages`
  const id = packageId ? encodeURIComponent(packageId as string) : ""
  const act = action as Action
  let method: "POST" | "PUT" | "DELETE" = "POST"
  let path = base
  if (act === "update") { method = "PUT"; path = `${base}/${id}` }
  else if (act === "archive") { method = "DELETE"; path = `${base}/${id}` }
  else if (act !== "create") { path = `${base}/${id}/${act}` }

  const hasBody = act === "create" || act === "update"
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt.apiToken}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(data ?? {}) } : {}),
    cache: "no-store",
  })

  if (res.ok) {
    if (packageId) revalidatePath(`/${tenantSlug}/roteiros/${packageId}`)
    revalidatePath(`/${tenantSlug}/roteiros`)
    // Padrão + "layout": todas as páginas sob qualquer destino (roteiros, roteiros/[id], guias, guias/[guide-id])
    revalidatePath("/destinos/[destination-slug]", "layout")
  }
  const out = res.status === 204 ? null : await res.text()
  return new NextResponse(out, { status: res.status, headers: { "Content-Type": "application/json" } })
}
