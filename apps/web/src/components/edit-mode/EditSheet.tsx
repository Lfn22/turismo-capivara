"use client"
import { X } from "lucide-react"
import { useEffect, useId, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"

export type EditSheetProps = {
  open: boolean
  title: string
  onClose: () => void
  children?: ReactNode
  footer?: ReactNode
  /** Renderiza no fluxo da página (painéis), sem portal, fundo, trava de rolagem nem botão de fechar. */
  inline?: boolean
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
const FIRST_FIELD =
  '.capi-editsheet__body input:not([disabled]):not([type="hidden"]),.capi-editsheet__body select:not([disabled]),.capi-editsheet__body textarea:not([disabled])'

/** Folha inferior abaixo de 768px, painel lateral de 480px acima. */
export function EditSheet({ open, title, onClose, children, footer, inline = false }: EditSheetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  const titleId = useId()

  useEffect(() => {
    if (!open || inline) return
    const prev = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const firstField = ref.current?.querySelector<HTMLElement>(FIRST_FIELD)
    ;(firstField ?? ref.current)?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current()
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
      prev?.focus?.()
    }
  }, [open, inline])

  if (!open) return null

  if (inline) {
    return (
      <section className="capi-editsheet--inline" aria-labelledby={titleId}>
        <div className="capi-editsheet__panel">
          <div className="capi-editsheet__head">
            <h2 id={titleId} className="capi-editsheet__title">{title}</h2>
          </div>
          <div className="capi-editsheet__body">{children}</div>
          {footer ? <div className="capi-editsheet__foot">{footer}</div> : null}
        </div>
      </section>
    )
  }

  if (typeof document === "undefined") return null

  return createPortal(
    <div className="capi-editsheet" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="capi-editsheet__panel"
      >
        <div className="capi-editsheet__head">
          <h2 id={titleId} className="capi-editsheet__title">{title}</h2>
          <button type="button" className="capi-iconbtn capi-iconbtn--ghost" aria-label="Fechar" onClick={onClose}>
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="capi-editsheet__body">{children}</div>
        {footer ? <div className="capi-editsheet__foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
