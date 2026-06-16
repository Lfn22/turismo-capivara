import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

async function getAuthToken(req: NextRequest): Promise<string | null> {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  return (jwt?.apiToken as string) || null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params
  const token = await getAuthToken(req)
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const res = await fetch(`${API_URL}/tenants/${slug}/destinations/${id}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params
  const token = await getAuthToken(req)
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // ADMIN pode editar qualquer destino do seu tenant (incluindo APPROVED).
  // Esta rota repassa para o service updateDestination() via PATCH na API,
  // que não tem esse bypass — o bypass de ADMIN está no routes.ts da API.
  const body = await req.text()
  const res = await fetch(`${API_URL}/tenants/${slug}/destinations/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  })
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params
  const token = await getAuthToken(req)
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const res = await fetch(`${API_URL}/tenants/${slug}/destinations/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
