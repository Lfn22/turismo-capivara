import type { LucideIcon } from "lucide-react"
import type { ButtonHTMLAttributes } from "react"
import { cx } from "./utils"

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: LucideIcon
  /** Obrigatório: vira aria-label e tooltip. */
  label: string
  variant?: "ghost" | "secondary" | "primary" | "glass"
  size?: "sm" | "md"
  badge?: number | string
}

/** Botão só com ícone, 44×44 (36 no sm). Para voltar, fechar, favoritar, compartilhar, menu. */
export function IconButton({ icon: Icon, label, variant = "ghost", size = "md", badge, className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx("capi-iconbtn", `capi-iconbtn--${variant}`, `capi-iconbtn--${size}`, className)}
      {...rest}
    >
      <Icon size={size === "sm" ? 18 : 20} strokeWidth={1.75} aria-hidden="true" />
      {badge != null && badge !== 0 ? <span className="capi-iconbtn__badge">{badge}</span> : null}
    </button>
  )
}
