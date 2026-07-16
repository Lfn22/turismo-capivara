import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

export async function GET(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }
  if (jwt.role !== "SUPER_ADMIN" && jwt.role !== "ADMIN") {
    return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const limit = searchParams.get("limit") ?? "50"
  const offset = searchParams.get("offset") ?? "0"
  const status = searchParams.get("status")

  const params = new URLSearchParams({ limit, offset })
  if (status) params.set("status", status)

  const res = await fetch(`${API_URL}/admin/destinations?${params}`, {
    headers: { Authorization: `Bearer ${jwt.apiToken}` },
    cache: "no-store",
  })
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
