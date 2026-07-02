import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params
  const email = request.nextUrl.searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })
  }

  const url = `${API_URL}/tenants/${slug}/bookings/${id}?email=${encodeURIComponent(email)}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    return NextResponse.json({ error: 'Reserva não encontrada' }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json({ status: data.status })
}
