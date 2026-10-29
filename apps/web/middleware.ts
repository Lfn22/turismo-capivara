import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { isPlatformStaff } from "@/lib/roles"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Rotas de API nunca passam pelo guard de role — apenas pelo withAuth
    if (pathname.startsWith('/api/')) {
      return NextResponse.next()
    }

    // Extrair slug do path (ex: /serra-viva/painel/dashboard)
    const slugMatch = pathname.match(/^\/([^/]+)\//)
    const slug = slugMatch?.[1] ?? ""

    // Sem sessão — redireciona para /{slug}/login (tenant-aware)
    // Exceto para /super-admin que não tem slug-based login
    if (!token) {
      // Caminho relativo (não req.url) para sobreviver ao safeCallbackUrl no login
      const callbackUrl = encodeURIComponent(pathname + req.nextUrl.search)
      if (pathname.startsWith('/super-admin') || pathname.startsWith('/pendencias')) {
        return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, req.url))
      }
      return NextResponse.redirect(
        new URL(`/${slug}/login?callbackUrl=${callbackUrl}`, req.url)
      )
    }

    const PAINEL_ROLES = ["CONDUTOR", "ADMIN"]
    if (
      pathname.includes("/painel") &&
      !pathname.startsWith('/super-admin') &&
      !PAINEL_ROLES.includes(token?.role as string)
    ) {
      return NextResponse.redirect(
        new URL(`/${slug}/login?error=forbidden`, req.url)
      )
    }

    if (pathname.includes("/admin") && !pathname.startsWith('/super-admin') && token?.role !== "ADMIN") {
      return NextResponse.redirect(
        new URL(`/${slug}/login?error=forbidden`, req.url)
      )
    }

    if (pathname.startsWith('/super-admin') && !isPlatformStaff(token?.role as string)) {
      return NextResponse.redirect(new URL('/login?error=forbidden', req.url))
    }

    // Gestão de admins da plataforma é exclusiva do SUPER_ADMIN
    if (pathname.startsWith('/super-admin/admins') && token?.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/super-admin/operadoras', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // Sempre true — lógica de auth tratada acima no middleware
      authorized: () => true,
    },
  }
)

export const config = {
  matcher: [
    "/:slug/painel/:path*",
    "/:slug/admin/:path*",
    "/super-admin/:path*",
    "/pendencias",
  ],
}
