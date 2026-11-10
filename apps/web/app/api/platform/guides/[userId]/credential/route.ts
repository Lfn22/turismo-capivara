import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"]

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }

  const { userId } = await params
  if (!/^[a-z0-9]+$/i.test(userId) || userId.length > 64) {
    return NextResponse.json({ message: "Parâmetro inválido" }, { status: 400 })
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}/platform/guides/${userId}/credential`, {
      headers: { Authorization: `Bearer ${jwt.apiToken as string}` },
      cache: "no-store",
    })
  } catch {
    return NextResponse.json({ message: "Serviço indisponível" }, { status: 502 })
  }

  const upstreamType = res.headers.get("Content-Type") ?? ""
  const allowed = ALLOWED_TYPES.find((t) => upstreamType.toLowerCase().startsWith(t))

  const headers: Record<string, string> = {
    "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  }
  if (allowed) {
    headers["Content-Type"] = upstreamType
    const disposition = res.headers.get("Content-Disposition")
    if (disposition) headers["Content-Disposition"] = disposition
  } else {
    headers["Content-Type"] = "application/octet-stream"
    headers["Content-Disposition"] = 'attachment; filename="comprovante"'
  }

  return new NextResponse(res.body, { status: res.status, headers })
}
