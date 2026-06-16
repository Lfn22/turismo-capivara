import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

export async function POST(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const token = jwt.apiToken as string

  const folder = req.nextUrl.searchParams.get("folder")
  if (!folder || !["destinations", "packages"].includes(folder)) {
    return NextResponse.json({ message: "Parâmetro folder inválido" }, { status: 400 })
  }
  const formData = await req.formData()

  const res = await fetch(`${API_URL}/uploads/photos?folder=${encodeURIComponent(folder)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
