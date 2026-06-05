import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SidebarNav } from "@/components/sidebar/SidebarNav"
import { Toaster } from "sonner"
import ErrorBoundary from "@/src/components/ui/ErrorBoundary"

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

  const role = (session.user as any).role
  const PAINEL_ROLES = ["CONDUTOR", "ADMIN", "ATENDENTE"]
  if (!PAINEL_ROLES.includes(role)) {
    redirect(`/${slug}/login?error=forbidden`)
  }

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .painel-main {
            padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 16px) !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
            padding-top: 24px !important;
          }
        }
      `}</style>
      <ErrorBoundary>
        <Toaster position="top-right" richColors />
        <div style={{ display: "flex", minHeight: "100dvh" }}>
          <SidebarNav slug={slug} />
          <main
            className="painel-main"
            style={{
              flex: 1,
              background: "var(--stone-50)",
              padding: "32px 24px",
              minWidth: 0,
            }}
          >
            {children}
          </main>
        </div>
      </ErrorBoundary>
    </>
  )
}
