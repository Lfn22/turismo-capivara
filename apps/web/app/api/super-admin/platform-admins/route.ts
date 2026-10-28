import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

async function authorize(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) {
    return { error: NextResponse.json({ message: "Não autenticado" }, { status: 401 }) }
  }
  if (jwt.role !== "SUPER_ADMIN") {
    return { error: NextResponse.json({ message: "Acesso negado" }, { status: 403 }) }
  }
  return { token: jwt.apiToken as string }
}

export async function GET(req: NextRequest) {
  const auth = await authorize(req)
  if (auth.error) return auth.error
  const res = await fetch(`${API_URL}/platform-admins`, {
    headers: { Authorization: `Bearer ${auth.token}` },
    cache: "no-store",
  })
  return new NextResponse(await res.text(), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function POST(req: NextRequest) {
  const auth = await authorize(req)
  if (auth.error) return auth.error
  const body = await req.text()
  const res = await fetch(`${API_URL}/platform-admins`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body,
    cache: "no-store",
  })
  return new NextResponse(await res.text(), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
