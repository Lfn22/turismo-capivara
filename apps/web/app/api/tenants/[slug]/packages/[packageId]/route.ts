import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

/** Detalhe público do roteiro (preço do grupo e horários) para o formulário de reserva. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; packageId: string }> },
) {
  const { slug, packageId } = await params
  try {
    const res = await fetch(
      `${API_URL}/tenants/${encodeURIComponent(slug)}/packages/${encodeURIComponent(packageId)}`,
      { cache: 'no-store' },
    )
    const data = await res.text()
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
    })
  } catch {
    return NextResponse.json({ message: 'Erro ao carregar o roteiro.' }, { status: 502 })
  }
}
