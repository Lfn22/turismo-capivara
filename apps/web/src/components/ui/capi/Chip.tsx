import type { LucideIcon } from "lucide-react"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cx } from "./utils"

export type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  selected?: boolean
  icon?: LucideIcon
  count?: number
  children: ReactNode
}

/** Filtro em pílula. Selecionado = preenchido com a cor do texto (não ocre). */
export function Chip({ selected = false, icon: Icon, count, className, children, type = "button", ...rest }: ChipProps) {
  return (
    <button type={type} aria-pressed={selected} className={cx("capi-chip", selected && "is-selected", className)} {...rest}>
      {Icon ? <Icon size={16} strokeWidth={1.75} aria-hidden="true" /> : null}
      {children}
      {count != null ? <span className="capi-chip__count">{count}</span> : null}
    </button>
  )
}
