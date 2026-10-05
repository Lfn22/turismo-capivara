"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Route,
  Ticket,
  User,
  type LucideIcon,
} from "lucide-react"
import {
  Avatar,
  Button,
  IconButton,
  ListGroup,
  ListRow,
  Modal,
  SidebarLinks,
  cx,
  type NavItem,
} from "@/src/components/ui/capi"

// ── Itens do painel (rotas reais) ─────────────────────────────────────────────
// `primary` = aparece na bottom nav do celular; o resto vai para "Mais".

type PainelItem = NavItem & { labelShort: string; title: string; primary: boolean }

function navItems(slug: string): PainelItem[] {
  return [
    { label: "Visão geral", labelShort: "Início",   title: "Visão geral", href: `/${slug}/painel/dashboard`,       icon: LayoutDashboard, primary: true  },
    { label: "Reservas",    labelShort: "Reservas", title: "Reservas",    href: `/${slug}/painel/reservas`,        icon: Ticket,          primary: true  },
    { label: "Agenda",      labelShort: "Agenda",   title: "Agenda",      href: `/${slug}/painel/disponibilidade`, icon: CalendarDays,    primary: true  },
    { label: "Roteiros",    labelShort: "Roteiros", title: "Roteiros",    href: `/${slug}/painel/roteiros`,        icon: Route,           primary: true  },
    { label: "Destinos",    labelShort: "Destinos", title: "Destinos",      href: `/${slug}/painel/destinos`,        icon: MapPin,          primary: false },
    { label: "Perfil",      labelShort: "Perfil",   title: "Perfil",      href: `/${slug}/painel/perfil`,          icon: User,            primary: false },
  ]
}

const ROLE_LABEL: Record<string, string> = {
  CONDUTOR: "Condutor",
  ADMIN: "Administrador",
  ATENDENTE: "Atendente",
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/")
}

function Logo({ slug }: { slug: string }) {
  return (
    <Link href="/" className="capi-logo" aria-label="CAPI — página inicial" style={{ minHeight: "var(--touch-target)" }}>
      <Image src="/images/logo.png" alt="CAPI" width={40} height={36} priority style={{ width: "auto" }} />
      <span className="sr-only-capi">Painel de {slug}</span>
    </Link>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SidebarNav({
  slug,
  tenantName,
  userName,
  userEmail,
  userImage,
  role,
}: {
  slug: string
  tenantName?: string
  userName?: string | null
  userEmail?: string | null
  userImage?: string | null
  role?: string | null
}) {
  const pathname = usePathname() ?? ""
  const items = navItems(slug)
  const primary = items.filter((i) => i.primary)
  const more = items.filter((i) => !i.primary)
  const [moreOpen, setMoreOpen] = useState(false)

  const current = items.find((i) => isActive(pathname, i.href))
  const moreActive = more.some((i) => isActive(pathname, i.href))
  const who = userName || userEmail || "Minha conta"
  const whoSub = (role && ROLE_LABEL[role]) || userEmail || ""

  function handleSignOut() {
    signOut({ callbackUrl: `/${slug}/login` })
  }

  return (
    <>
      <style>{`
        /* Sidebar: some no celular, recolhida (72px) de 768 a 1023px, expandida (264px) a partir de 1024px */
        .painel-sidebar { display: none; flex: none; overflow-y: auto; }
        .painel-sidebar .capi-sidebar__brand { flex-direction: column; align-items: flex-start; gap: var(--space-1); }
        .painel-sidebar__eyebrow { margin: 0; font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--text-primary); }
        @media (min-width: 768px) {
          .painel-sidebar { display: flex; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .painel-sidebar { width: var(--sidebar-collapsed); padding: var(--space-4) var(--space-2); align-items: center; }
          .painel-sidebar .capi-sidebar__brand { align-items: center; padding: 0 0 var(--space-3); }
          .painel-sidebar .capi-logo img { height: 22px !important; }
          .painel-sidebar .capi-sidebar__tenant,
          .painel-sidebar .painel-sidebar__eyebrow,
          .painel-sidebar .capi-sidebar__who,
          .painel-sidebar .capi-sidebar__count { display: none; }
          /* rótulo some visualmente mas continua dando nome acessível ao link */
          .painel-sidebar .capi-sidebar__label {
            position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
            overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
          }
          .painel-sidebar .capi-sidebar__item { justify-content: center; padding: 0; width: var(--touch-target); }
          .painel-sidebar .capi-sidebar__user { flex-direction: column; padding: var(--space-3) 0 0; }
        }

        /* Top bar do celular (56px) */
        .painel-topbar {
          position: sticky; top: 0; z-index: var(--z-sticky);
          display: flex; align-items: center; gap: var(--space-3);
          height: 56px; padding: 0 var(--space-2) 0 var(--gutter-mobile);
          background: var(--glass); -webkit-backdrop-filter: saturate(1.6) blur(16px); backdrop-filter: saturate(1.6) blur(16px);
          border-bottom: 1px solid var(--border); font-family: var(--font-sans);
        }
        .painel-topbar .capi-logo img { height: 28px !important; }
        .painel-topbar__title {
          flex: 1; min-width: 0; margin: 0; font-size: 17px; font-weight: 700; color: var(--text);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .painel-topbar__avatar { display: inline-flex; align-items: center; justify-content: center; width: var(--touch-target); height: var(--touch-target); border-radius: 50%; }
        @media (min-width: 768px) { .painel-topbar { display: none; } }

        /* "Mais" é um botão dentro da bottom nav */
        .painel-bottomnav__more { appearance: none; border: 0; background: none; font: inherit; cursor: pointer; }
      `}</style>

      {/* ── Sidebar (≥768px) ─────────────────────────────────────────────── */}
      <aside className="capi-sidebar painel-sidebar" aria-label="Menu do painel">
        <div className="capi-sidebar__brand">
          <Logo slug={slug} />
          <p className="painel-sidebar__eyebrow">Painel do guia</p>
          <span className="capi-sidebar__tenant">{tenantName ?? slug}</span>
        </div>

        <SidebarLinks items={items} />

        <div className="capi-sidebar__user">
          <Avatar name={who} src={userImage} size={36} />
          <div className="capi-sidebar__who">
            <p>{who}</p>
            {whoSub ? <p>{whoSub}</p> : null}
          </div>
          <IconButton icon={LogOut} label="Sair" size="sm" onClick={handleSignOut} />
        </div>
      </aside>

      {/* ── Top bar (<768px) ─────────────────────────────────────────────── */}
      <header className="painel-topbar">
        <Logo slug={slug} />
        <p className="painel-topbar__title">{current?.title ?? "Painel"}</p>
        <Link href={`/${slug}/painel/perfil`} className="painel-topbar__avatar" aria-label="Meu perfil">
          <Avatar name={who} src={userImage} size={32} />
        </Link>
      </header>

      {/* ── Bottom nav (<768px): 4 itens principais + Mais ───────────────── */}
      <nav className="capi-bottomnav" aria-label="Navegação do painel">
        {primary.map((it) => {
          const act = isActive(pathname, it.href)
          const Icon: LucideIcon = it.icon
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cx("capi-bottomnav__item", act && "is-active")}
              aria-current={act ? "page" : undefined}
            >
              <span className="capi-bottomnav__pill">
                <Icon size={22} strokeWidth={act ? 2 : 1.75} aria-hidden="true" />
              </span>
              <span className="capi-bottomnav__label">{it.labelShort}</span>
            </Link>
          )
        })}
        <button
          type="button"
          className={cx("capi-bottomnav__item painel-bottomnav__more", moreActive && "is-active")}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(true)}
        >
          <span className="capi-bottomnav__pill">
            <Menu size={22} strokeWidth={moreActive ? 2 : 1.75} aria-hidden="true" />
          </span>
          <span className="capi-bottomnav__label">Mais</span>
        </button>
      </nav>

      <Modal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Mais opções"
        description={tenantName ?? slug}
        footer={
          <Button variant="secondary" iconLeft={LogOut} onClick={handleSignOut} fullWidth>
            Sair
          </Button>
        }
      >
        <div onClick={() => setMoreOpen(false)}>
          <ListGroup>
            {more.map((it) => {
              const Icon = it.icon
              return (
                <ListRow
                  key={it.href}
                  href={it.href}
                  leading={<Icon size={20} strokeWidth={1.75} aria-hidden="true" />}
                  title={it.label}
                />
              )
            })}
          </ListGroup>
        </div>
      </Modal>
    </>
  )
}
