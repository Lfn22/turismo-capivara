import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }
  const { id } = await params
  const body = await req.text()
  const res = await fetch(`${API_URL}/tenants/${id}/reject`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${jwt.apiToken}`, "Content-Type": "application/json" },
    body,
    cache: "no-store",
  })
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
