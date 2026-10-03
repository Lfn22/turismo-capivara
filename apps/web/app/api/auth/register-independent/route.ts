import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function validateBody(body: unknown): body is {
  name: string
  email: string
  password: string
  tenantSlug?: string
} {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b.name === 'string' && b.name.length > 0 && b.name.length <= 200 &&
    typeof b.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email) && b.email.length <= 254 &&
    typeof b.password === 'string' && b.password.length >= 6 && b.password.length <= 128 &&
    (b.tenantSlug === undefined || (typeof b.tenantSlug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.tenantSlug)))
  )
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!validateBody(body)) {
    return NextResponse.json({ error: 'Dados de cadastro inválidos' }, { status: 400 })
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}/auth/register-independent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch {
    return NextResponse.json({ message: 'Serviço indisponível' }, { status: 502 })
  }

  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
