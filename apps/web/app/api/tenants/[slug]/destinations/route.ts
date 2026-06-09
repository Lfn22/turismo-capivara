import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const token = (jwt?.apiToken as string) ?? ""

  const res = await fetch(`${API_URL}/tenants/${slug}/destinations`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const token = (jwt?.apiToken as string) ?? ""

  const body = await req.text()
  const res = await fetch(`${API_URL}/tenants/${slug}/destinations`, {
    method: "POST",
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
