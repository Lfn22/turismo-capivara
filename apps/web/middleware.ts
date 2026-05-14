import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Extrair slug do path (ex: /serra-viva/painel/dashboard)
    const slugMatch = pathname.match(/^\/([^/]+)\//)
    const slug = slugMatch?.[1] ?? ""

    // Sem sessão — redireciona para /{slug}/login (tenant-aware)
    if (!token) {
      return NextResponse.redirect(
        new URL(`/${slug}/login?callbackUrl=${encodeURIComponent(req.url)}`, req.url)
      )
    }

    if (pathname.includes("/painel") && token?.role !== "CONDUTOR") {
      return NextResponse.redirect(
        new URL(`/${slug}/login?error=forbidden`, req.url)
      )
    }

    if (pathname.includes("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(
        new URL(`/${slug}/login?error=forbidden`, req.url)
      )
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
  matcher: ["/:slug/painel/:path*", "/:slug/admin/:path*"],
}
