import { NextRequest, NextResponse } from 'next/server'
import { internalProxyHeaders } from '@/src/lib/internal-headers'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export async function POST(request: NextRequest) {
  const body = await request.text()

  let res: Response
  try {
    res = await fetch(`${API_URL}/tenants/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...internalProxyHeaders(request.headers) },
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
