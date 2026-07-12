import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params

  // CR-002: Strict allowlist — only alphanumeric, /, ., -, _, @ permitted
  // Rejects encoded sequences (%2F etc), null bytes, and arbitrary hosts
  const SAFE_SEGMENT = /^[a-zA-Z0-9@._-]+$/
  if (path.length === 0 || path.some(segment => !SAFE_SEGMENT.test(segment))) {
    return NextResponse.json({ error: 'Caminho inválido' }, { status: 400 })
  }

  const key = process.env.MAPTILER_KEY
  if (!key) {
    return NextResponse.json({ error: 'Serviço de tiles não configurado' }, { status: 500 })
  }

  const upstreamUrl = `https://api.maptiler.com/${path.join('/')}?key=${key}`

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { 'User-Agent': 'turismo-capivara/1.0' }
    })

    const body = await upstream.arrayBuffer()
    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'

    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': contentType }
    })
  } catch {
    return NextResponse.json({ error: 'Falha ao buscar tile' }, { status: 502 })
  }
}
