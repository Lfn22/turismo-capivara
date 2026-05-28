"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

// ── SVG Icons ────────────────────────────────────────────────────────────────

function IconBookings() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function IconMap() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z" />
      <path d="M9 4v13M15 7v13" />
    </svg>
  )
}

function IconGrid() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// ── Nav items — ordered by usage: Reservas > Disponibilidade > Roteiros > Dashboard > Perfil

function navItems(slug: string) {
  return [
    { label: "Reservas",        labelShort: "Reservas",  href: `/${slug}/painel/reservas`,        icon: <IconBookings /> },
    { label: "Disponibilidade", labelShort: "Agenda",    href: `/${slug}/painel/disponibilidade`, icon: <IconCalendar /> },
    { label: "Roteiros",        labelShort: "Roteiros",  href: `/${slug}/painel/roteiros`,        icon: <IconMap />      },
    { label: "Dashboard",       labelShort: "Início",    href: `/${slug}/painel/dashboard`,       icon: <IconGrid />     },
    { label: "Perfil",          labelShort: "Perfil",    href: `/${slug}/painel/perfil`,          icon: <IconUser />     },
  ]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SidebarNav({ slug, tenantName }: { slug: string; tenantName?: string }) {
  const pathname = usePathname()
  const items = navItems(slug)

  return (
    <>
      <style>{`
        /* ── Desktop sidebar ── */
        .pnav-sidebar {
          width: 240px;
          min-width: 240px;
          background: var(--stone-900);
          position: sticky;
          top: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ── Mobile bottom tab bar — hidden on desktop ── */
        .pnav-bottom {
          display: none;
        }

        @media (max-width: 767px) {
          .pnav-sidebar {
            display: none;
          }

          .pnav-bottom {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 50;
            background: var(--stone-900);
            border-top: 1px solid rgba(255,255,255,0.08);
            /* iPhone safe area */
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
        }

        /* ── Bottom tab item ── */
        .pnav-tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          text-decoration: none;
          color: var(--stone-500);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.02em;
          padding: 10px 4px;
          min-height: 56px;
          -webkit-tap-highlight-color: transparent;
          transition: color 0.15s;
        }

        .pnav-tab--active {
          color: var(--ochre);
        }

        .pnav-tab__dot {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--ochre);
        }
      `}</style>

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <nav className="pnav-sidebar" aria-label="Navegação do painel">

        {/* Brand */}
        <div style={{ padding: "24px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "var(--stone-100)", fontWeight: 600, margin: 0 }}>
            {tenantName ?? slug}
          </p>
          <p style={{ fontSize: "11px", color: "var(--stone-500)", marginTop: "4px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Painel do Guia
          </p>
        </div>

        {/* Links */}
        <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
          {items.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    fontSize: "14px",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--stone-100)" : "var(--stone-400)",
                    background: isActive ? "rgba(196,133,42,0.08)" : "transparent",
                    borderLeft: isActive ? "3px solid var(--ochre)" : "3px solid transparent",
                    textDecoration: "none",
                    transition: "background 0.15s, color 0.15s",
                    minHeight: "44px",
                  }}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Logout */}
        <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={() => signOut({ callbackUrl: `/${slug}/login` })}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              background: "transparent",
              color: "var(--stone-400)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "4px",
              fontSize: "14px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <IconLogout />
            Sair
          </button>
        </div>
      </nav>

      {/* ── Mobile bottom tab bar ───────────────────────────────────────── */}
      <nav className="pnav-bottom" aria-label="Navegação do painel">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`pnav-tab${isActive ? " pnav-tab--active" : ""}`}
            >
              {item.icon}
              <span>{item.labelShort}</span>
              {isActive && <span className="pnav-tab__dot" aria-hidden="true" />}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
