import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'slug inválido' }, { status: 400 })
  }

  const body = await req.text()

  // Turista logado vincula a reserva à conta; sem sessão segue como guest
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (jwt?.apiToken) headers.Authorization = `Bearer ${jwt.apiToken}`

  let res: Response
  try {
    res = await fetch(`${API_URL}/tenants/${slug}/bookings`, {
      method: 'POST',
      headers,
      body,
    })
  } catch {
    return NextResponse.json({ message: 'Serviço indisponível' }, { status: 502 })
  }

  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  })
}
