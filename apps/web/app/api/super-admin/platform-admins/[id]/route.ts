import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }
  if (jwt.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  }
  const { id } = await params
  const res = await fetch(`${API_URL}/platform-admins/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${jwt.apiToken}` },
    cache: "no-store",
  })
  if (res.status === 204) return new NextResponse(null, { status: 204 })
  return new NextResponse(await res.text(), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
