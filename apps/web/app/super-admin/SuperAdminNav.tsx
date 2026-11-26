'use client'
import { useCallback, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { BadgeCheck, Building2, LogOut, Map as MapIcon, Menu, Route, Users } from 'lucide-react'
import {
  Avatar,
  Button,
  IconButton,
  Modal,
  SidebarLinks,
  cx,
  type NavItem,
} from '@/src/components/ui/capi'
import { NotificationBell } from '@/src/components/layout/NotificationBell'

const baseNavItems: NavItem[] = [
  { label: 'Operadoras', href: '/super-admin/operadoras', icon: Building2 },
  { label: 'Destinos', href: '/super-admin/destinos', icon: MapIcon },
  { label: 'Roteiros', href: '/super-admin/roteiros', icon: Route },
  { label: 'Guias', href: '/super-admin/guias', icon: BadgeCheck },
]

function Logo({ height }: { height?: number }) {
  return (
    <Link
      href="/"
      aria-label="CAPI — página inicial"
      className="capi-logo"
      style={{ minHeight: 'var(--touch-target)' }}
    >
      <Image
        src="/images/logo.png"
        alt="CAPI"
        width={40}
        height={36}
        priority
        style={height ? { height, width: 'auto', display: 'block' } : undefined}
      />
    </Link>
  )
}

const handleSignOut = () => signOut({ callbackUrl: '/' })

function Sidebar({
  collapsed,
  userName,
  userEmail,
  role,
  navItems,
}: {
  collapsed?: boolean
  userName?: string | null
  userEmail?: string | null
  role?: string
  navItems: NavItem[]
}) {
  return (
    <aside
      className={cx('capi-sidebar', collapsed && 'is-collapsed')}
      aria-label="Menu do super-admin"
    >
      <div className="capi-sidebar__brand">
        <Logo />
        {!collapsed ? <span className="capi-sidebar__tenant">Super-admin</span> : null}
      </div>
      <SidebarLinks items={navItems} collapsed={collapsed} />
      <div className="sa-sidebar__bell">
        <NotificationBell role={role} align="left" />
      </div>
      <div className="capi-sidebar__user">
        <Avatar name={userName ?? userEmail ?? 'Super-admin'} size={36} />
        <div className="capi-sidebar__who">
          <p>{userName ?? 'Super-admin'}</p>
          {userEmail ? <p>{userEmail}</p> : null}
        </div>
        <IconButton icon={LogOut} label="Sair" size="sm" onClick={handleSignOut} />
      </div>
    </aside>
  )
}

/**
 * Navegação do super-admin: top bar + menu em sheet abaixo de 768px,
 * sidebar recolhida de 768 a 1023px e sidebar completa a partir de 1024px.
 */
export default function SuperAdminNav({
  userName,
  userEmail,
  role,
}: {
  userName?: string | null
  userEmail?: string | null
  role?: string
}) {
  const pathname = usePathname() ?? ''
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const navItems: NavItem[] =
    role === 'SUPER_ADMIN'
      ? [...baseNavItems, { label: 'Admins', href: '/super-admin/admins', icon: Users }]
      : baseNavItems

  const current = navItems.find((i) => pathname === i.href || pathname.startsWith(i.href + '/'))

  return (
    <>
      <style>{`
        .sa-sidebar__bell { color: var(--text-secondary); }
        .sa-sidebar__bell .notif-panel { position: fixed; top: auto; bottom: var(--space-4); left: calc(var(--sidebar-width) + 8px); }
        .capi-sidebar.is-collapsed .sa-sidebar__bell .notif-panel { left: calc(var(--sidebar-collapsed) + 8px); }
        .sa-topbar { color: var(--text); }
      `}</style>
      {/* Mobile: top bar */}
      <header
        className="sa-topbar md:hidden sticky top-0 z-40 flex items-center gap-3 border-b border-line bg-surface px-4"
        style={{ height: 'var(--topbar-height)' }}
      >
        <Logo height={30} />
        <p className="flex-1 min-w-0 truncate text-[15px] font-semibold text-fg">
          {current?.label ?? 'Super-admin'}
        </p>
        <NotificationBell role={role} />
        <IconButton
          icon={Menu}
          label="Abrir menu"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
        />
      </header>

      <Modal
        open={menuOpen}
        onClose={closeMenu}
        title="Super-admin"
        description={userEmail ?? undefined}
        footer={
          <Button variant="secondary" iconLeft={LogOut} onClick={handleSignOut} fullWidth>
            Sair
          </Button>
        }
      >
        <nav aria-label="Menu do super-admin" className="flex flex-col gap-1" onClick={closeMenu}>
          {navItems.map((it) => {
            const active = current?.href === it.href
            const Icon = it.icon
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? 'page' : undefined}
                className={cx('capi-sidebar__item', active && 'is-active')}
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
        <Sidebar
          collapsed
          userName={userName}
          userEmail={userEmail}
          role={role}
          navItems={navItems}
        />
      </div>

      {/* Desktop: sidebar completa */}
      <div className="hidden lg:block shrink-0">
        <Sidebar userName={userName} userEmail={userEmail} role={role} navItems={navItems} />
      </div>
    </>
  )
}
