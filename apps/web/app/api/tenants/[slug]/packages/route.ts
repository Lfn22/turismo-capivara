import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { revalidatePath } from "next/cache"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }

  const { slug } = await params
  const body = await req.text()
  const res = await fetch(`${API_URL}/tenants/${slug}/packages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt.apiToken}`,
      "Content-Type": "application/json",
    },
    body,
    cache: "no-store",
  })
  const data = await res.text()
  if (res.ok) {
    revalidatePath(`/${slug}/roteiros`)
    revalidatePath("/destinos/[destination-slug]", "layout")
  }
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  })
}
