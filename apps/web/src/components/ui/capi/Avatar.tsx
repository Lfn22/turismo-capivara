import { Check, Star } from "lucide-react"
import { cx, formatRating } from "./utils"

function initials(name?: string | null) {
  return (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
}

export type AvatarProps = {
  name?: string | null
  src?: string | null
  size?: number
  verified?: boolean
  className?: string
}

/** Foto ou iniciais em círculo, com selo opcional de guia verificado. */
export function Avatar({ name, src, size = 40, verified, className }: AvatarProps) {
  return (
    <span className={cx("capi-avatar", className)} style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatares vêm de hosts variados
        <img src={src} alt={name ?? ""} />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
      {verified ? (
        <span className="capi-avatar__verified" title="Guia verificado">
          <Check size={Math.max(10, Math.round(size * 0.24))} strokeWidth={3} aria-hidden="true" />
          <span className="sr-only-capi">Guia verificado</span>
        </span>
      ) : null}
    </span>
  )
}

export type RatingProps = {
  value: number | null | undefined
  count?: number | null
  size?: number
  className?: string
}

/** Estrela + nota com vírgula + contagem. Sem avaliações: "Novo". */
export function Rating({ value, count, size = 16, className }: RatingProps) {
  if (value == null) return <span className={cx("capi-rating capi-rating--new", className)}>Novo</span>
  const v = formatRating(value)
  return (
    <span
      className={cx("capi-rating", className)}
      aria-label={`Avaliação ${v}${count != null ? ` de ${count} avaliações` : ""}`}
    >
      <Star size={size} fill="currentColor" strokeWidth={0} className="capi-rating__star" aria-hidden="true" />
      <span className="capi-rating__value" aria-hidden="true">{v}</span>
      {count != null ? <span className="capi-rating__count" aria-hidden="true">({count})</span> : null}
    </span>
  )
}
