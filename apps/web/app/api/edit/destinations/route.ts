import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

async function forward(req: NextRequest, method: "GET" | "POST") {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }
  const res = await fetch(`${API_URL}${method === "GET" ? "/edit/destinations" : "/destinations"}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt.apiToken}`,
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    ...(method === "POST" ? { body: await req.text() } : {}),
    cache: "no-store",
  })
  const data = await res.text()
  if (method === "POST" && res.ok) revalidatePath("/destinos")
  return new NextResponse(data, { status: res.status, headers: { "Content-Type": "application/json" } })
}

export const GET = (req: NextRequest) => forward(req, "GET")
export const POST = (req: NextRequest) => forward(req, "POST")
