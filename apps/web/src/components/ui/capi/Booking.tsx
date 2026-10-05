"use client"

import { ShieldCheck, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "./Button"
import { cx } from "./utils"

/* ── SlotPicker ───────────────────────────────────────── */
export type SlotDay = { value: string; weekday: string; day: string; month: string; available?: boolean }
export type SlotTime = { value: string; label?: string; spots: number }

/** Datas em faixa horizontal com snap + horários com vagas restantes. */
export function SlotPicker({ days, selectedDay, onSelectDay, times = [], selectedTime, onSelectTime, dayLabel = "Escolha a data", timeLabel = "Horário", emptyTimes }: {
  days: SlotDay[]
  selectedDay?: string | null
  onSelectDay?: (v: string) => void
  times?: SlotTime[]
  selectedTime?: string | null
  onSelectTime?: (v: string) => void
  dayLabel?: string
  timeLabel?: string
  emptyTimes?: ReactNode
}) {
  return (
    <div className="capi-slots">
      <p className="capi-slots__label">{dayLabel}</p>
      <div className="capi-slots__days" role="listbox" aria-label="Datas disponíveis">
        {days.map((d) => {
          const on = d.value === selectedDay
          return (
            <button key={d.value} type="button" role="option" aria-selected={on} disabled={d.available === false} className={cx("capi-slots__day", on && "is-selected")} onClick={() => onSelectDay?.(d.value)}>
              <span className="capi-slots__wd">{d.weekday}</span>
              <span className="capi-slots__dn">{d.day}</span>
              <span className="capi-slots__mo">{d.month}</span>
            </button>
          )
        })}
      </div>
      {selectedDay ? (
        <>
          <p className="capi-slots__label">{timeLabel}</p>
          {times.length === 0 ? (
            emptyTimes ?? <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Nenhum horário disponível nesta data.</p>
          ) : (
            <div className="capi-slots__times" role="listbox" aria-label="Horários disponíveis">
              {times.map((t) => {
                const on = t.value === selectedTime
                const full = t.spots === 0
                return (
                  <button key={t.value} type="button" role="option" aria-selected={on} disabled={full} className={cx("capi-slots__time", on && "is-selected")} onClick={() => onSelectTime?.(t.value)}>
                    <span className="capi-slots__t">{t.label ?? t.value}</span>
                    <span className="capi-slots__spots">{full ? "Esgotado" : `${t.spots} ${t.spots === 1 ? "vaga" : "vagas"}`}</span>
                  </button>
                )
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

/* ── BookingSummary ───────────────────────────────────── */
export type BookingSummaryProps = {
  title?: ReactNode
  subtitle?: ReactNode
  image?: ReactNode
  details?: Array<{ icon?: LucideIcon; label: string; value: ReactNode }>
  lines?: Array<{ label: string; value: ReactNode }>
  total?: ReactNode
  totalLabel?: string
  action?: ReactNode
  note?: ReactNode
  className?: string
}

export function BookingSummary({ title, subtitle, image, details = [], lines = [], total, totalLabel = "Total", action, note, className }: BookingSummaryProps) {
  return (
    <aside className={cx("capi-summary", className)}>
      {title ? (
        <div className="capi-summary__head">
          {image}
          <div>
            <p className="capi-summary__title">{title}</p>
            {subtitle ? <p className="capi-summary__sub">{subtitle}</p> : null}
          </div>
        </div>
      ) : null}
      {details.length > 0 ? (
        <dl className="capi-summary__details">
          {details.map((d) => {
            const Icon = d.icon
            return (
              <div key={d.label}>
                <dt>{Icon ? <Icon size={16} strokeWidth={1.75} aria-hidden="true" /> : null}{d.label}</dt>
                <dd>{d.value}</dd>
              </div>
            )
          })}
        </dl>
      ) : null}
      {lines.length > 0 ? (
        <dl className="capi-summary__lines">
          {lines.map((l) => (
            <div key={l.label}><dt>{l.label}</dt><dd>{l.value}</dd></div>
          ))}
        </dl>
      ) : null}
      {total ? <div className="capi-summary__total"><span>{totalLabel}</span><strong>{total}</strong></div> : null}
      {action ? <div className="capi-summary__action">{action}</div> : null}
      {note ? <p className="capi-summary__note"><ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" />{note}</p> : null}
    </aside>
  )
}

/* ── BookingBar ───────────────────────────────────────── */
/** Barra fixa no rodapé do celular (some ≥1024px). Substitui a BottomNav nas páginas de roteiro. */
export function BookingBar({ price, prefix = "a partir de", unit = "/pessoa", ctaLabel = "Reservar", href, onClick }: {
  price: ReactNode
  prefix?: string
  unit?: string
  ctaLabel?: string
  href?: string
  onClick?: () => void
}) {
  return (
    <div className="capi-bookbar">
      <div className="capi-bookbar__price">
        <span className="capi-bookbar__from">{prefix}</span>
        <span><strong>{price}</strong><span className="capi-bookbar__unit"> {unit}</span></span>
      </div>
      <Button size="lg" href={href} onClick={onClick}>{ctaLabel}</Button>
    </div>
  )
}
