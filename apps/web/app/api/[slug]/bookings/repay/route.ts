import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const body = await request.text()

  let res: Response
  try {
    res = await fetch(`${API_URL}/tenants/${slug}/bookings/repay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
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
