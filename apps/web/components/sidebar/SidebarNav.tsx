"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

interface NavItem {
  label: string
  href: string
  symbol: string
}

function navItems(slug: string): NavItem[] {
  return [
    { label: "Dashboard",       href: `/${slug}/painel/dashboard`,       symbol: "◉" },
    { label: "Reservas",        href: `/${slug}/painel/reservas`,        symbol: "📋" },
    { label: "Roteiros",        href: `/${slug}/painel/roteiros`,        symbol: "🗺" },
    { label: "Disponibilidade", href: `/${slug}/painel/disponibilidade`, symbol: "📅" },
    { label: "Perfil",          href: `/${slug}/painel/perfil`,          symbol: "👤" },
  ]
}

export function SidebarNav({ slug, tenantName }: { slug: string; tenantName?: string }) {
  const pathname = usePathname()

  return (
    <nav
      style={{
        width: "240px",
        minWidth: "240px",
        background: "var(--stone-900)",
        position: "sticky",
        top: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      aria-label="Navegação do painel"
    >
      {/* Área do logo */}
      <div
        style={{
          padding: "24px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
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
          {tenantName ?? slug}
        </p>
        <p style={{ fontSize: "11px", color: "var(--stone-500)", marginTop: "4px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Painel do Guia
        </p>
      </div>

      {/* Links de navegação */}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
        {navItems(slug).map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
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
                aria-current={isActive ? "page" : undefined}
              >
                <span aria-hidden="true">{item.symbol}</span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Botão Sair */}
      <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          onClick={() => signOut({ callbackUrl: `/${slug}/login` })}
          style={{
            width: "100%",
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
          Sair
        </button>
      </div>
    </nav>
  )
}
