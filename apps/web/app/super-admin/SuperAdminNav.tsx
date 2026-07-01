"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { label: "Operadoras", href: "/super-admin/operadoras" },
  { label: "Destinos", href: "/super-admin/destinos" },
]

export default function SuperAdminNav() {
  const pathname = usePathname()
  return (
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
  )
}
