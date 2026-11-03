import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ID_RE = /^[a-z0-9]{10,}$/

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params

  if (!SLUG_RE.test(slug) || !ID_RE.test(id)) {
    return NextResponse.json({ error: 'parâmetros inválidos' }, { status: 400 })
  }

  const email = request.nextUrl.searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })
  }

  const url = `${API_URL}/tenants/${slug}/bookings/${id}?email=${encodeURIComponent(email)}`

  let res: Response
  try {
    res = await fetch(url, { cache: 'no-store' })
  } catch {
    return NextResponse.json({ message: 'Serviço indisponível' }, { status: 502 })
  }

  if (!res.ok) {
    return NextResponse.json({ error: 'Reserva não encontrada' }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json({ status: data.status })
}
