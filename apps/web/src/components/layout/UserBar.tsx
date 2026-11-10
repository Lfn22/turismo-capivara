"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { isPlatformStaff } from "@/lib/roles"
import { NotificationBell } from "./NotificationBell"
import { useEditMode } from "@/src/components/edit-mode/EditModeProvider"
import { Avatar } from "@/src/components/ui/capi"

function painelHref(role: string | undefined, tenantSlug: string | null | undefined): string | null {
  if (isPlatformStaff(role)) return "/super-admin/operadoras"
  if (!tenantSlug) return null
  if (role === "ADMIN") return `/${tenantSlug}/admin/guias`
  return `/${tenantSlug}/painel/dashboard`
}

export function UserBar() {
  const { data: session, status } = useSession()
  const active = status === "authenticated" && !!session?.user
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { available, enabled, setEnabled } = useEditMode()

  useEffect(() => {
    if (!active) return
    document.documentElement.style.setProperty("--userbar-h", "40px")
    return () => {
      document.documentElement.style.removeProperty("--userbar-h")
    }
  }, [active])

  useEffect(() => {
    if (!menuOpen) return
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [menuOpen])

  if (!active || !session?.user) return null

  const role = session.user.role as string | undefined
  const painel = role === "CLIENTE" ? null : painelHref(role, session.user.tenantSlug)
  const showPendencias = role === "ADMIN" || role === "SUPER_ADMIN" || role === "PLATFORM_ADMIN"
  const name = session.user.name ?? session.user.email ?? "Usuário"

  const itemStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "10px 14px",
    fontSize: "14px",
    color: "var(--stone-900)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
    fontFamily: "var(--font-body)",
  }

  return (
    <div
      style={{
        height: "40px",
        background: "var(--stone-900)",
        color: "var(--stone-50)",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "12px",
        padding: "0 16px",
        position: "relative",
        zIndex: 60,
        fontFamily: "var(--font-body)",
        fontSize: "14px",
      }}
    >
      <NotificationBell role={role} />
      {available && (
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled(!enabled)}
          style={{
            background: enabled ? "var(--stone-50)" : "transparent",
            color: enabled ? "var(--stone-900)" : "var(--stone-50)",
            border: "1px solid var(--stone-50)",
            borderRadius: "999px",
            padding: "0 12px",
            minHeight: "32px",
            cursor: "pointer",
            fontSize: "14px",
            fontFamily: "var(--font-body)",
            whiteSpace: "nowrap",
          }}
        >
          ✏️ Modo edição
        </button>
      )}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--stone-50)",
            cursor: "pointer",
            fontSize: "14px",
            fontFamily: "var(--font-body)",
            maxWidth: "220px",
            minHeight: "40px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Avatar name={name} src={session.user.photoUrl} size={28} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name} ▾</span>
        </button>
        {menuOpen && (
          <div
            role="menu"
            style={{
              position: "absolute",
              right: 0,
              top: "40px",
              minWidth: "180px",
              background: "var(--stone-50)",
              border: "1px solid var(--stone-200)",
              borderRadius: "4px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              overflow: "hidden",
            }}
          >
            {painel && (
              <Link role="menuitem" href={painel} style={itemStyle} onClick={() => setMenuOpen(false)}>
                Meu painel
              </Link>
            )}
            <Link role="menuitem" href="/conta" style={itemStyle} onClick={() => setMenuOpen(false)}>
              Minha conta
            </Link>
            {showPendencias && (
              <Link role="menuitem" href="/pendencias" style={itemStyle} onClick={() => setMenuOpen(false)}>
                Pendências
              </Link>
            )}
            <button
              type="button"
              role="menuitem"
              style={itemStyle}
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
