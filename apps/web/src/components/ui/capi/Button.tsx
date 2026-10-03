import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cx } from "./utils"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link"
export type ButtonSize = "sm" | "md" | "lg"

type Common = {
  variant?: ButtonVariant
  size?: ButtonSize
  iconLeft?: LucideIcon
  iconRight?: LucideIcon
  loading?: boolean
  fullWidth?: boolean
  className?: string
  children: ReactNode
}

export type ButtonProps = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
    /** Com href, renderiza um link (next/link para rotas internas). */
    href?: string
    target?: string
    rel?: string
  }

/**
 * Botão de ação. `primary` marca a próxima ação do usuário: um por tela ou bloco.
 * `danger` só para confirmar ação destrutiva dentro de Modal.
 */
export function Button({
  variant = "primary",
  size = "md",
  iconLeft: IconLeft,
  iconRight: IconRight,
  loading = false,
  fullWidth = false,
  className,
  children,
  href,
  target,
  rel,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const iconSize = size === "sm" ? 16 : 18
  const cls = cx(
    "capi-btn",
    `capi-btn--${variant}`,
    `capi-btn--${size}`,
    fullWidth && "capi-btn--full",
    loading && "is-loading",
    className,
  )
  const content = (
    <>
      {loading ? (
        <span className="capi-spinner" aria-hidden="true" />
      ) : IconLeft ? (
        <IconLeft size={iconSize} strokeWidth={1.75} aria-hidden="true" />
      ) : null}
      <span className="capi-btn__label">{children}</span>
      {!loading && IconRight ? <IconRight size={iconSize} strokeWidth={1.75} aria-hidden="true" /> : null}
    </>
  )

  if (href && !disabled) {
    const external = /^https?:\/\//.test(href) || href.startsWith("mailto:") || href.startsWith("tel:")
    if (external) {
      return (
        <a href={href} className={cls} target={target} rel={rel ?? (target === "_blank" ? "noopener noreferrer" : undefined)}>
          {content}
        </a>
      )
    }
    return (
      <Link href={href} className={cls} target={target} rel={rel}>
        {content}
      </Link>
    )
  }

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  )
}
