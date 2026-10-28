import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const body = await req.text()

  // Turista logado vincula a reserva à conta; sem sessão segue como guest
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (jwt?.apiToken) headers.Authorization = `Bearer ${jwt.apiToken}`

  const res = await fetch(`${API_URL}/tenants/${slug}/bookings`, {
    method: 'POST',
    headers,
    body,
  })

  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
