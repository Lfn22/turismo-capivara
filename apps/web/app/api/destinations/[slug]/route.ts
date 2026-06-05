import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }
  if (jwt.role !== "ADMIN" && jwt.role !== "SUPER_ADMIN" && jwt.role !== "CONDUTOR") {
    return NextResponse.json({ message: "Acesso negado" }, { status: 403 })
  }

  const { slug } = await params
  const body = await req.text()

  const res = await fetch(`${API_URL}/destinations/${slug}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${jwt.apiToken}`,
      "Content-Type": "application/json",
    },
    body,
    cache: "no-store",
  })

  const data = await res.text()
  if (res.ok) {
    revalidatePath(`/destinos/${slug}`)
    revalidatePath('/destinos')
  }
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
