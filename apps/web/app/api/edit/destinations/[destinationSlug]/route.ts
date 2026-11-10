import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

type Ctx = { params: Promise<{ destinationSlug: string }> }

async function forward(req: NextRequest, { params }: Ctx, method: "GET" | "PATCH" | "DELETE" | "POST") {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }
  const { destinationSlug } = await params
  const slug = encodeURIComponent(destinationSlug)

  let path = `/destinations/${slug}`
  if (method === "GET") path = `/edit/destinations/${slug}`
  if (method === "POST") {
    const action = req.nextUrl.searchParams.get("action")
    if (action !== "archive" && action !== "restore") {
      return NextResponse.json({ message: "Ação inválida" }, { status: 400 })
    }
    path = `/destinations/${slug}/${action}`
  }

  const hasBody = method === "PATCH" || method === "DELETE"
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt.apiToken}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    ...(hasBody ? { body: await req.text() } : {}),
    cache: "no-store",
  })

  if (method !== "GET" && res.ok) {
    revalidatePath("/destinos")
    // Caminho literal não cascateia: o padrão + "layout" pega a página do destino e todas as subpáginas
    revalidatePath("/destinos/[destination-slug]", "layout")
  }
  const data = res.status === 204 ? null : await res.text()
  return new NextResponse(data, { status: res.status, headers: { "Content-Type": "application/json" } })
}

export const GET = (req: NextRequest, ctx: Ctx) => forward(req, ctx, "GET")
export const PATCH = (req: NextRequest, ctx: Ctx) => forward(req, ctx, "PATCH")
export const DELETE = (req: NextRequest, ctx: Ctx) => forward(req, ctx, "DELETE")
export const POST = (req: NextRequest, ctx: Ctx) => forward(req, ctx, "POST")
