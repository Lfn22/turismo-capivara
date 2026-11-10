import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

export async function POST(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }

  const formData = await req.formData()
  let res: Response
  try {
    res = await fetch(`${API_URL}/guides/me/credential`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt.apiToken as string}` },
      body: formData,
    })
  } catch {
    return NextResponse.json({ message: "Serviço indisponível" }, { status: 502 })
  }
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  })
}
