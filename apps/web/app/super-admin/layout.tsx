"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Toaster } from "sonner"

const navItems = [
  { label: "Operadoras", href: "/super-admin/operadoras" },
  { label: "Destinos", href: "/super-admin/destinos" },
]

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{ minHeight: "100dvh", background: "var(--stone-50)" }}>
      <header
        style={{
          background: "white",
          borderBottom: "1px solid var(--stone-200)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: "32px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "18px",
            fontWeight: 400,
            color: "var(--stone-900)",
            textDecoration: "none",
          }}
        >
          CAPI
        </Link>
        <span style={{ color: "var(--stone-400)", fontSize: "14px" }}>Painel Super-Admin</span>
        <nav style={{ display: "flex", gap: "4px" }}>
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "6px 14px",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--ochre)" : "var(--stone-600)",
                  background: active ? "var(--ochre-light, #FEF9EC)" : "transparent",
                  textDecoration: "none",
                  transition: "background 0.15s",
                }}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>
      <main
        style={{
          padding: "32px 24px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  )
}
