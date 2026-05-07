import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect(`/${slug}/login`)
  }

  if ((session.user as any).role !== "ADMIN") {
    redirect(`/${slug}/login?error=forbidden`)
  }

  return (
    <>
      <header
        style={{
          background: "var(--stone-900)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "16px",
            color: "var(--stone-100)",
            fontWeight: 600,
            margin: 0,
          }}
        >
          {slug} — Admin
        </p>
        <Link
          href={`/${slug}/login`}
          style={{ fontSize: "14px", color: "var(--stone-400)", textDecoration: "none" }}
        >
          Sair
        </Link>
      </header>
      <main
        style={{
          background: "var(--stone-50)",
          minHeight: "calc(100vh - 56px)",
          padding: "32px 24px",
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          {children}
        </div>
      </main>
    </>
  )
}
