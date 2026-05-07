import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Extrair slug do path (ex: /serra-viva/painel/dashboard)
    const slugMatch = pathname.match(/^\/([^/]+)\//)
    const slug = slugMatch?.[1] ?? ""

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
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ["/:slug/painel/:path*", "/:slug/admin/:path*"],
}
