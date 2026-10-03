"use client"
import { useCallback, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Building2, Map as MapIcon, Menu } from "lucide-react"
import { Avatar, IconButton, Modal, SidebarLinks, cx, type NavItem } from "@/src/components/ui/capi"

const navItems: NavItem[] = [
  { label: "Operadoras", href: "/super-admin/operadoras", icon: Building2 },
  { label: "Destinos", href: "/super-admin/destinos", icon: MapIcon },
]

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

function Sidebar({ collapsed, userName, userEmail }: { collapsed?: boolean; userName?: string | null; userEmail?: string | null }) {
  return (
    <aside className={cx("capi-sidebar", collapsed && "is-collapsed")} aria-label="Menu do super-admin">
      <div className="capi-sidebar__brand">
        <Logo />
        {!collapsed ? <span className="capi-sidebar__tenant">Super-admin</span> : null}
      </div>
      <SidebarLinks items={navItems} collapsed={collapsed} />
      {userName || userEmail ? (
        <div className="capi-sidebar__user">
          <Avatar name={userName ?? userEmail} size={36} />
          <div className="capi-sidebar__who">
            <p>{userName ?? "Super-admin"}</p>
            {userEmail ? <p>{userEmail}</p> : null}
          </div>
        </div>
      ) : null}
    </aside>
  )
}

/**
 * Navegação do super-admin: top bar + menu em sheet abaixo de 768px,
 * sidebar recolhida de 768 a 1023px e sidebar completa a partir de 1024px.
 */
export default function SuperAdminNav({ userName, userEmail }: { userName?: string | null; userEmail?: string | null }) {
  const pathname = usePathname() ?? ""
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const current = navItems.find((i) => pathname === i.href || pathname.startsWith(i.href + "/"))

  return (
    <>
      {/* Mobile: top bar */}
      <header
        className="md:hidden sticky top-0 z-40 flex items-center gap-3 border-b border-line bg-surface px-4"
        style={{ height: "var(--topbar-height)" }}
      >
        <Logo height={30} />
        <p className="flex-1 min-w-0 truncate text-[15px] font-semibold text-fg">
          {current?.label ?? "Super-admin"}
        </p>
        <IconButton icon={Menu} label="Abrir menu" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} />
      </header>

      <Modal open={menuOpen} onClose={closeMenu} title="Super-admin" description={userEmail ?? undefined}>
        <nav aria-label="Menu do super-admin" className="flex flex-col gap-1" onClick={closeMenu}>
          {navItems.map((it) => {
            const active = current?.href === it.href
            const Icon = it.icon
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cx("capi-sidebar__item", active && "is-active")}
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                <span className="capi-sidebar__label">{it.label}</span>
              </Link>
            )
          })}
        </nav>
      </Modal>

      {/* Tablet: sidebar recolhida */}
      <div className="hidden md:block lg:hidden shrink-0">
        <Sidebar collapsed userName={userName} userEmail={userEmail} />
      </div>

      {/* Desktop: sidebar completa */}
      <div className="hidden lg:block shrink-0">
        <Sidebar userName={userName} userEmail={userEmail} />
      </div>
    </>
  )
}
