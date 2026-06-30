import { NextRequest, NextResponse } from "next/server"

const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const res = await fetch(`${API_URL}/tenants/${params.slug}`, {
      cache: "no-store",
    })
    if (!res.ok) return NextResponse.json({ approvalStatus: null }, { status: 200 })
    const data = await res.json()
    return NextResponse.json(
      { approvalStatus: data.approvalStatus ?? null },
      { status: 200 }
    )
  } catch {
    return NextResponse.json({ approvalStatus: null }, { status: 200 })
  }
}
