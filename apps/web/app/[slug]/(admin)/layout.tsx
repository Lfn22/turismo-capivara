import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { LogOut, Users } from "lucide-react"
import { Avatar, cx } from "@/src/components/ui/capi"

function Logo({ height }: { height?: number }) {
  return (
    <Link
      href="/"
      aria-label="CAPI — página inicial"
      className="capi-logo"
      style={{ minHeight: "var(--touch-target)" }}
    >
      <Image
        src="/images/logo.png"
        alt="CAPI"
        width={40}
        height={36}
        priority
        style={height ? { height, width: "auto", display: "block" } : undefined}
      />
    </Link>
  )
}

/**
 * Sidebar da administração da operadora. Renderizada no servidor: a área tem uma
 * única seção (Guias), então o item fica sempre ativo e não precisa de usePathname.
 */
function AdminSidebar({
  slug,
  collapsed,
  userName,
  userEmail,
}: {
  slug: string
  collapsed?: boolean
  userName?: string | null
  userEmail?: string | null
}) {
  const itemTitle = (label: string) => (collapsed ? label : undefined)
  return (
    <aside className={cx("capi-sidebar", collapsed && "is-collapsed")} aria-label="Menu da administração">
      <div className="capi-sidebar__brand">
        <Logo />
        {!collapsed ? <span className="capi-sidebar__tenant">{slug}</span> : null}
      </div>
      <nav className="capi-sidebar__nav" aria-label="Administração">
        <Link
          href={`/${slug}/admin/guias`}
          className="capi-sidebar__item is-active"
          aria-current="page"
          title={itemTitle("Guias")}
        >
          <Users size={20} strokeWidth={1.75} aria-hidden="true" />
          <span className="capi-sidebar__label">Guias</span>
        </Link>
      </nav>
      <Link href={`/${slug}/login`} className="capi-sidebar__item" title={itemTitle("Sair")}>
        <LogOut size={20} strokeWidth={1.75} aria-hidden="true" />
        <span className="capi-sidebar__label">Sair</span>
      </Link>
      {userName || userEmail ? (
        <div className="capi-sidebar__user">
          <Avatar name={userName ?? userEmail} size={36} />
          <div className="capi-sidebar__who">
            <p>{userName ?? "Administrador"}</p>
            {userEmail ? <p>{userEmail}</p> : null}
          </div>
        </div>
      ) : null}
    </aside>
  )
}

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

  const userName = session.user?.name
  const userEmail = session.user?.email

  return (
    <div className="min-h-dvh bg-page md:flex">
      {/* Mobile: top bar (a área tem uma seção só, então não precisa de menu) */}
      <header
        className="md:hidden sticky top-0 z-40 flex items-center gap-3 border-b border-line bg-surface px-4"
        style={{ height: "var(--topbar-height)" }}
      >
        <Logo height={30} />
        <div className="flex-1 min-w-0">
          <p className="truncate text-[15px] font-semibold text-fg">Guias</p>
          <p className="truncate text-xs text-fg-secondary">{slug} · Administração</p>
        </div>
        <Link
          href={`/${slug}/login`}
          className="capi-iconbtn capi-iconbtn--ghost capi-iconbtn--md"
          aria-label="Sair"
          title="Sair"
        >
          <LogOut size={20} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </header>

      {/* Tablet: sidebar recolhida */}
      <div className="hidden md:block lg:hidden shrink-0">
        <AdminSidebar slug={slug} collapsed userName={userName} userEmail={userEmail} />
      </div>

      {/* Desktop: sidebar completa */}
      <div className="hidden lg:block shrink-0">
        <AdminSidebar slug={slug} userName={userName} userEmail={userEmail} />
      </div>

      <main className="flex-1 min-w-0 px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <div className="mx-auto w-full" style={{ maxWidth: "var(--container-content)" }}>
          {children}
        </div>
      </main>
    </div>
  )
}
