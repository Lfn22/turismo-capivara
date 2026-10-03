import Link from "next/link"
import { ChevronRight, CircleAlert, CircleCheck, Compass, Info, TrendingDown, TrendingUp, TriangleAlert, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cx } from "./utils"

/* ── StatCard ─────────────────────────────────────────── */
export type StatCardProps = {
  label: string
  value: ReactNode
  icon?: LucideIcon
  delta?: string
  /** Se a variação é boa (up, verde) ou ruim (down, vermelho) — não a direção. */
  deltaTone?: "up" | "down"
  deltaLabel?: string
}

export function StatCard({ label, value, icon: Icon, delta, deltaTone, deltaLabel }: StatCardProps) {
  const tone = deltaTone ?? (delta && delta.trim().startsWith("-") ? "down" : "up")
  const TIcon = tone === "down" ? TrendingDown : TrendingUp
  return (
    <div className="capi-stat">
      <div className="capi-stat__head">
        <p className="capi-stat__label">{label}</p>
        {Icon ? <span className="capi-stat__icon"><Icon size={18} strokeWidth={1.75} aria-hidden="true" /></span> : null}
      </div>
      <p className="capi-stat__value">{value}</p>
      {delta ? (
        <p className={cx("capi-stat__delta", `is-${tone}`)}>
          <TIcon size={14} strokeWidth={2} aria-hidden="true" />
          {delta}
          {deltaLabel ? <span> {deltaLabel}</span> : null}
        </p>
      ) : null}
    </div>
  )
}

/* ── ListRow ──────────────────────────────────────────── */
export type ListRowProps = {
  title: ReactNode
  subtitle?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  meta?: ReactNode
  href?: string
  onClick?: () => void
  className?: string
}

/** Linha de lista tocável (64px+): substitui tabelas no mobile. */
export function ListRow({ title, subtitle, leading, trailing, meta, href, onClick, className }: ListRowProps) {
  const interactive = Boolean(href || onClick)
  const inner = (
    <>
      {leading ? <div className="capi-row__lead">{leading}</div> : null}
      <div className="capi-row__main">
        <p className="capi-row__title">{title}</p>
        {subtitle ? <p className="capi-row__sub">{subtitle}</p> : null}
      </div>
      {trailing || meta ? (
        <div className="capi-row__trail">
          {trailing}
          {meta ? <p className="capi-row__meta">{meta}</p> : null}
        </div>
      ) : null}
      {interactive ? <ChevronRight size={18} strokeWidth={1.75} className="capi-row__chev" aria-hidden="true" /> : null}
    </>
  )
  const cls = cx("capi-row", interactive && "is-interactive", className)
  if (href) return <Link href={href} className={cls}>{inner}</Link>
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>
  return <div className={cls}>{inner}</div>
}

/** Contêiner com borda para empilhar ListRow. */
export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("capi-listgroup", className)} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--surface)" }}>
      {children}
    </div>
  )
}

/* ── EmptyState ───────────────────────────────────────── */
export type EmptyStateProps = {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
  compact?: boolean
}

export function EmptyState({ title, description, icon: Icon = Compass, action, compact }: EmptyStateProps) {
  return (
    <div className={cx("capi-empty", compact && "is-compact")}>
      <span className="capi-empty__icon"><Icon size={28} strokeWidth={1.5} aria-hidden="true" /></span>
      <p className="capi-empty__title">{title}</p>
      {description ? <p className="capi-empty__desc">{description}</p> : null}
      {action ? <div className="capi-empty__action">{action}</div> : null}
    </div>
  )
}

/* ── Alert ────────────────────────────────────────────── */
const ALERT_ICON: Record<string, LucideIcon> = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleAlert, brand: Info }

export type AlertProps = {
  tone?: "info" | "success" | "warning" | "danger" | "brand"
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
}

/** Aviso persistente dentro do conteúdo. Confirmações rápidas usam toast (Sonner). */
export function Alert({ tone = "info", title, children, action, className }: AlertProps) {
  const Icon = ALERT_ICON[tone]
  return (
    <div className={cx("capi-alert", `capi-alert--${tone}`, className)} role={tone === "danger" ? "alert" : "status"}>
      <Icon size={20} strokeWidth={1.75} className="capi-alert__icon" aria-hidden="true" />
      <div className="capi-alert__body">
        {title ? <p className="capi-alert__title">{title}</p> : null}
        {children ? <div className="capi-alert__text">{children}</div> : null}
        {action ? <div className="capi-alert__action">{action}</div> : null}
      </div>
    </div>
  )
}

/* ── Skeleton ─────────────────────────────────────────── */
export function Skeleton({ width = "100%", height = 16, radius, lines }: { width?: number | string; height?: number; radius?: number; lines?: number }) {
  if (lines) {
    return (
      <div className="capi-skel-lines" aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <span key={i} className="capi-skel" style={{ width: i === lines - 1 ? "60%" : "100%", height: 12 }} />
        ))}
      </div>
    )
  }
  return <span className="capi-skel" aria-hidden="true" style={{ width, height, borderRadius: radius }} />
}

/* ── PageHeader ───────────────────────────────────────── */
export type PageHeaderProps = {
  title: ReactNode
  eyebrow?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  backHref?: string
  backLabel?: string
}

export function PageHeader({ title, eyebrow, description, actions, backHref, backLabel = "Voltar" }: PageHeaderProps) {
  return (
    <header className="capi-pagehead">
      {backHref ? (
        <Link href={backHref} className="capi-pagehead__back">
          <ChevronRight size={16} strokeWidth={2} style={{ transform: "rotate(180deg)" }} aria-hidden="true" />
          {backLabel}
        </Link>
      ) : null}
      <div className="capi-pagehead__row">
        <div>
          {eyebrow ? <p className="capi-pagehead__eyebrow">{eyebrow}</p> : null}
          <h1 className="capi-pagehead__title">{title}</h1>
          {description ? <p className="capi-pagehead__desc">{description}</p> : null}
        </div>
        {actions ? <div className="capi-pagehead__actions">{actions}</div> : null}
      </div>
    </header>
  )
}
