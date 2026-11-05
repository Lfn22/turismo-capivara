import { decode, encode, type JWT } from "next-auth/jwt"
import { NextResponse, type NextRequest } from "next/server"
import { isPlatformStaff } from "@/lib/roles"
import { ensureFreshApiToken } from "@/src/lib/api-token"

const SECRET = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? ""
// Mesmos padrões do next-auth v4 (getToken / SessionStore)
const SECURE_COOKIE = process.env.NEXTAUTH_URL?.startsWith("https://") ?? !!process.env.VERCEL
const SESSION_COOKIE = SECURE_COOKIE ? "__Secure-next-auth.session-token" : "next-auth.session-token"
const SESSION_MAX_AGE = 30 * 24 * 60 * 60
const CHUNK_SIZE = 4096 - 163

type SessionChange = { value: string | null } | null

function sessionCookieNames(req: NextRequest): string[] {
  return req.cookies.getAll().map((c) => c.name).filter((n) => n.startsWith(SESSION_COOKIE))
}

function readSessionCookie(req: NextRequest): string {
  const suffix = (n: string) => parseInt(n.split(".").pop() ?? "0") || 0
  return sessionCookieNames(req)
    .sort((a, b) => suffix(a) - suffix(b))
    .map((n) => req.cookies.get(n)?.value ?? "")
    .join("")
}

function chunkSessionCookie(value: string): { name: string; value: string }[] {
  if (value.length <= CHUNK_SIZE) return [{ name: SESSION_COOKIE, value }]
  const chunks: { name: string; value: string }[] = []
  for (let i = 0; i * CHUNK_SIZE < value.length; i++) {
    chunks.push({ name: `${SESSION_COOKIE}.${i}`, value: value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE) })
  }
  return chunks
}

/**
 * Lê a sessão e renova o token da API se estiver perto de expirar.
 * Retorna o token efetivo e a mudança de cookie a aplicar (novo valor, ou null = encerrar sessão).
 */
async function loadSession(req: NextRequest): Promise<{ token: JWT | null; change: SessionChange }> {
  const raw = readSessionCookie(req)
  if (!raw) return { token: null, change: null }
  let token: JWT | null = null
  try {
    token = (await decode({ token: raw, secret: SECRET })) as JWT | null
  } catch {
    return { token: null, change: null }
  }
  if (!token) return { token: null, change: null }

  const fresh = await ensureFreshApiToken(token)
  if (fresh.status === "invalid") return { token: null, change: { value: null } }
  if (fresh.status === "refreshed") {
    const value = await encode({ token: fresh.token, secret: SECRET, maxAge: SESSION_MAX_AGE })
    return { token: fresh.token, change: { value } }
  }
  return { token, change: null }
}

export default async function middleware(req: NextRequest) {
  const { token, change } = await loadSession(req)

  // Cookies da sessão alterados: aplica no request repassado (RSC/route handlers deste mesmo request
  // leem o token novo via getToken/cookies()) e na resposta (navegador).
  const oldNames = change ? sessionCookieNames(req) : []
  const newChunks = change?.value ? chunkSessionCookie(change.value) : []
  if (change) {
    for (const name of oldNames) req.cookies.delete(name)
    for (const c of newChunks) req.cookies.set(c.name, c.value)
  }
  const withCookies = (res: NextResponse) => {
    if (!change) return res
    for (const name of oldNames) {
      if (!newChunks.some((c) => c.name === name)) {
        res.cookies.set(name, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: SECURE_COOKIE })
      }
    }
    for (const c of newChunks) {
      res.cookies.set(c.name, c.value, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: SECURE_COOKIE,
        expires: new Date(Date.now() + SESSION_MAX_AGE * 1000),
      })
    }
    return res
  }
  const next = () => withCookies(NextResponse.next({ request: { headers: new Headers(req.headers) } }))
  const redirect = (url: string) => withCookies(NextResponse.redirect(new URL(url, req.url)))

  const pathname = req.nextUrl.pathname

  // Rotas de API e /conta não passam pelo guard de role — cada uma valida a sessão
  // (sessão encerrada acima = sem cookie → 401 / redirect para /login)
  if (pathname.startsWith("/api/") || pathname === "/conta") {
    return next()
  }

  // Extrair slug do path (ex: /serra-viva/painel/dashboard)
  const slugMatch = pathname.match(/^\/([^/]+)\//)
  const slug = slugMatch?.[1] ?? ""

  // Sem sessão — redireciona para /{slug}/login (tenant-aware)
  // Exceto para /super-admin que não tem slug-based login
  if (!token) {
    // Caminho relativo (não req.url) para sobreviver ao safeCallbackUrl no login
    const callbackUrl = encodeURIComponent(pathname + req.nextUrl.search)
    if (pathname.startsWith('/super-admin') || pathname.startsWith('/pendencias') || pathname === '/guia' || pathname.startsWith('/guia/')) {
      return redirect(`/login?callbackUrl=${callbackUrl}`)
    }
    return redirect(`/${slug}/login?callbackUrl=${callbackUrl}`)
  }

  const PAINEL_ROLES = ["CONDUTOR", "ADMIN"]
  if (
    pathname.includes("/painel") &&
    !pathname.startsWith('/super-admin') &&
    !PAINEL_ROLES.includes(token?.role as string)
  ) {
    return redirect(`/${slug}/login?error=forbidden`)
  }

  if (pathname.includes("/admin") && !pathname.startsWith('/super-admin') && token?.role !== "ADMIN") {
    return redirect(`/${slug}/login?error=forbidden`)
  }

  if (pathname.startsWith('/super-admin') && !isPlatformStaff(token?.role as string)) {
    return redirect('/login?error=forbidden')
  }

  // Gestão de admins da plataforma é exclusiva do SUPER_ADMIN
  if (pathname.startsWith('/super-admin/admins') && token?.role !== 'SUPER_ADMIN') {
    return redirect('/super-admin/operadoras')
  }

  return next()
}

export const config = {
  matcher: [
    "/:slug/painel/:path*",
    "/:slug/admin/:path*",
    "/super-admin/:path*",
    "/pendencias",
    "/guia/:path*",
    "/conta",
    // Route handlers que leem o token via getToken (proxy, edit, uploads...). /api/auth fica de fora:
    // o próprio next-auth renova no callback jwt e grava o cookie (evita brigar com signOut).
    "/api/((?!auth/).*)",
  ],
}
