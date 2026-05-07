import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SidebarNav } from "@/components/sidebar/SidebarNav"

export default async function PainelLayout({
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

  if ((session.user as any).role !== "CONDUTOR") {
    redirect(`/${slug}/login?error=forbidden`)
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SidebarNav slug={slug} />
      <main
        style={{
          flex: 1,
          background: "var(--stone-50)",
          padding: "32px 24px",
          minWidth: 0, // evita overflow horizontal
        }}
      >
        {children}
      </main>
    </div>
  )
}
