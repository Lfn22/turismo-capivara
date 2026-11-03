"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Check } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cx } from "./utils"

/* ── Tabs ─────────────────────────────────────────────── */
export type TabItem = { value: string; label: string; count?: number; href?: string }

export function Tabs({ items, value, onChange, variant = "underline", label, className }: {
  items: TabItem[]
  value: string
  onChange?: (v: string) => void
  variant?: "underline" | "segmented"
  label?: string
  className?: string
}) {
  return (
    <div className={cx("capi-tabs", `capi-tabs--${variant}`, className)} role="tablist" aria-label={label}>
      {items.map((it) => {
        const on = it.value === value
        const content = (
          <>
            {it.label}
            {it.count != null ? <span className="capi-tabs__count">{it.count}</span> : null}
          </>
        )
        return it.href ? (
          <Link key={it.value} href={it.href} role="tab" aria-selected={on} className={cx("capi-tabs__tab", on && "is-active")}>
            {content}
          </Link>
        ) : (
          <button key={it.value} type="button" role="tab" aria-selected={on} className={cx("capi-tabs__tab", on && "is-active")} onClick={() => onChange?.(it.value)}>
            {content}
          </button>
        )
      })}
    </div>
  )
}

/* ── Stepper ──────────────────────────────────────────── */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="capi-stepper" aria-label="Etapas">
      {steps.map((s, i) => {
        const st = i < current ? "done" : i === current ? "current" : "todo"
        return (
          <li key={s} className={`capi-stepper__step is-${st}`} aria-current={st === "current" ? "step" : undefined}>
            <span className="capi-stepper__dot">{st === "done" ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : i + 1}</span>
            <span className="capi-stepper__label">{s}</span>
          </li>
        )
      })}
    </ol>
  )
}

/* ── BottomNav ────────────────────────────────────────── */
export type NavItem = { href: string; label: string; icon: LucideIcon; count?: number; exact?: boolean }

function isActive(pathname: string, item: NavItem) {
  if (item.exact || item.href === "/") return pathname === item.href
  return pathname === item.href || pathname.startsWith(item.href + "/")
}

/** Navegação inferior no celular (some a partir de 768px). Máx. 5 itens. */
export function BottomNav({ items, label = "Navegação" }: { items: NavItem[]; label?: string }) {
  const pathname = usePathname() ?? "/"
  return (
    <nav className="capi-bottomnav" aria-label={label}>
      {items.map((it) => {
        const act = isActive(pathname, it)
        const Icon = it.icon
        return (
          <Link key={it.href} href={it.href} className={cx("capi-bottomnav__item", act && "is-active")} aria-current={act ? "page" : undefined}>
            <span className="capi-bottomnav__pill">
              <Icon size={22} strokeWidth={act ? 2 : 1.75} aria-hidden="true" />
            </span>
            <span className="capi-bottomnav__label">{it.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

/* ── TopNav ───────────────────────────────────────────── */
export type TopNavProps = {
  logo?: ReactNode
  links?: Array<{ href: string; label: string }>
  actions?: ReactNode
  start?: ReactNode
  tenantName?: string
  variant?: "solid" | "transparent"
  className?: string
}

/** Barra superior pública: vidro claro (solid) ou transparente sobre foto/hero. */
export function TopNav({ logo, links = [], actions, start, tenantName, variant = "solid", className }: TopNavProps) {
  const pathname = usePathname() ?? "/"
  return (
    <header className={cx("capi-topnav", variant === "transparent" && "is-transparent", className)}>
      <div className="capi-topnav__inner">
        <div className="capi-topnav__start">
          {start}
          {logo}
          {tenantName ? <span className="capi-topnav__tenant">{tenantName}</span> : null}
        </div>
        {links.length > 0 ? (
          <nav className="capi-topnav__links" aria-label="Principal">
            {links.map((l) => {
              const on = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href + "/"))
              return (
                <Link key={l.href} href={l.href} className={cx("capi-topnav__link", on && "is-active")} aria-current={on ? "page" : undefined}>
                  {l.label}
                </Link>
              )
            })}
          </nav>
        ) : null}
        <div className="capi-topnav__end">{actions}</div>
      </div>
    </header>
  )
}

/* ── SidebarNav (visual) ──────────────────────────────── */
export function SidebarLinks({ items, collapsed }: { items: NavItem[]; collapsed?: boolean }) {
  const pathname = usePathname() ?? "/"
  return (
    <nav className="capi-sidebar__nav" aria-label="Painel">
      {items.map((it) => {
        const act = isActive(pathname, it)
        const Icon = it.icon
        return (
          <Link key={it.href} href={it.href} className={cx("capi-sidebar__item", act && "is-active")} aria-current={act ? "page" : undefined} title={collapsed ? it.label : undefined}>
            <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
            <span className="capi-sidebar__label">{it.label}</span>
            {it.count ? <span className="capi-sidebar__count">{it.count}</span> : null}
          </Link>
        )
      })}
    </nav>
  )
}
