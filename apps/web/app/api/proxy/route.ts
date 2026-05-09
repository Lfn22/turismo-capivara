import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

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
  const path = searchParams.get("path")

  const ALLOWED_PATH = /^\/tenants\/[^/\s]+\//
  if (!path || !ALLOWED_PATH.test(path)) {
    return NextResponse.json({ message: "Parâmetro 'path' inválido" }, { status: 400 })
  }

  const upstream = `${API_URL}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwt.apiToken}`,
    "Content-Type": "application/json",
  }

  let body: string | undefined
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text()
  }

  const res = await fetch(upstream, {
    method: req.method,
    headers,
    ...(body !== undefined ? { body } : {}),
    cache: "no-store",
  })

  const data = await res.text()
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
