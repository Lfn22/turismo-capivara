import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cx } from "./utils"

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info"

export type BadgeProps = {
  tone?: Tone
  dot?: boolean
  icon?: LucideIcon
  className?: string
  title?: string
  children: ReactNode
}

/** Rótulo curto em pílula: categoria, selo ou estado. O texto sempre acompanha a cor. */
export function Badge({ tone = "neutral", dot, icon: Icon, className, title, children }: BadgeProps) {
  return (
    <span className={cx("capi-badge", `capi-badge--${tone}`, className)} title={title}>
      {dot ? <span className="capi-badge__dot" aria-hidden="true" /> : null}
      {Icon ? <Icon size={14} strokeWidth={2} aria-hidden="true" /> : null}
      {children}
    </span>
  )
}

const STATUS = {
  booking: {
    PENDING: ["Pendente", "warning"],
    CONFIRMED: ["Confirmada", "success"],
    CHECKED_IN: ["Check-in feito", "info"],
    COMPLETED: ["Concluída", "neutral"],
    CANCELLED: ["Cancelada", "danger"],
    NO_SHOW: ["Não compareceu", "neutral"],
  },
  approval: {
    PENDING: ["Em análise", "warning"],
    APPROVED: ["Aprovado", "success"],
    REJECTED: ["Rejeitado", "danger"],
  },
  difficulty: {
    EASY: ["Fácil", "success"],
    MODERATE: ["Moderado", "warning"],
    HARD: ["Difícil", "danger"],
  },
} as const satisfies Record<string, Record<string, readonly [string, Tone]>>

export type StatusKind = keyof typeof STATUS

export type StatusBadgeProps = {
  kind?: StatusKind
  status: string
  title?: string
  className?: string
}

/** Badge com rótulo e cor certos para reserva, aprovação ou dificuldade (enums da API). */
export function StatusBadge({ kind = "booking", status, title, className }: StatusBadgeProps) {
  const map = STATUS[kind] as Record<string, readonly [string, Tone]>
  const [label, tone] = map[status] ?? [status, "neutral" as Tone]
  return (
    <Badge tone={tone} dot={kind !== "difficulty"} title={title} className={className}>
      {label}
    </Badge>
  )
}
