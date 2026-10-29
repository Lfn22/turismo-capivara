import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const MAX_BODY_BYTES = 11 * 1024 * 1024

export async function POST(req: NextRequest) {
  const length = Number(req.headers.get("content-length") ?? 0)
  if (length > MAX_BODY_BYTES) {
    return NextResponse.json({ message: "O comprovante deve ter até 10 MB" }, { status: 413 })
  }

  const formData = await req.formData()

  let res: Response
  try {
    res = await fetch(`${API_URL}/auth/register-guide`, {
      method: "POST",
      body: formData,
      cache: "no-store",
    })
  } catch {
    return NextResponse.json({ message: "Serviço indisponível" }, { status: 502 })
  }
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  })
}
