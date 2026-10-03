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
        /* Celular: top bar + conteúdo em coluna; ≥768px: sidebar + conteúdo lado a lado */
        .painel-shell { min-height: 100dvh; background: var(--bg-page); }
        .painel-main {
          min-width: 0;
          padding: var(--space-6) var(--gutter-mobile);
          padding-bottom: calc(var(--bottombar-height) + env(safe-area-inset-bottom, 0px) + var(--space-6));
        }
        .painel-main__inner { width: 100%; max-width: var(--container-wide); margin-inline: auto; }
        @media (min-width: 768px) {
          .painel-shell { display: flex; }
          .painel-main { flex: 1; padding: var(--space-8) var(--gutter-tablet); }
        }
        @media (min-width: 1024px) {
          .painel-main { padding: var(--space-8); }
        }
      `}</style>
      <ErrorBoundary>
        <Toaster position="top-right" richColors />
        <div className="painel-shell">
          <SidebarNav
            slug={slug}
            userName={session.user?.name}
            userEmail={session.user?.email}
            role={role}
          />
          <main className="painel-main">
            <div className="painel-main__inner">{children}</div>
          </main>
        </div>
      </ErrorBoundary>
    </>
  )
}
