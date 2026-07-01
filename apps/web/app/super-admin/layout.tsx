import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Toaster } from "sonner"
import SuperAdminNav from "./SuperAdminNav"

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if ((session.user as any).role !== "SUPER_ADMIN") {
    redirect("/login?error=forbidden")
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--stone-50)" }}>
      <header
        style={{
          background: "white",
          borderBottom: "1px solid var(--stone-200)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: "32px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "18px",
            fontWeight: 400,
            color: "var(--stone-900)",
            textDecoration: "none",
          }}
        >
          CAPI
        </Link>
        <span style={{ color: "var(--stone-400)", fontSize: "14px" }}>Painel Super-Admin</span>
        <SuperAdminNav />
      </header>
      <main
        style={{
          padding: "32px 24px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  )
}
