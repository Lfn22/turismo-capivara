"use client"

import { X } from "lucide-react"
import { useEffect, useId, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { cx } from "./utils"

export type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children?: ReactNode
  /** Botões, na ordem secundário → primário. No mobile empilham com o primário por cima. */
  footer?: ReactNode
  size?: "md" | "lg"
}

/**
 * Diálogo modal: sheet que sobe do rodapé abaixo de 640px, caixa centrada acima.
 * Fecha com ×, Esc e clique fora; prende o foco e devolve ao fechar.
 */
export function Modal({ open, onClose, title, description, children, footer, size = "md" }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  // onClose em ref: o efeito não reexecuta (nem rouba o foco) quando o pai recria a função.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    ref.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current()
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        )
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
  }, [open])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div className="capi-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cx("capi-modal__panel", `is-${size}`)}
      >
        <span className="capi-modal__grab" aria-hidden="true" />
        <div className="capi-modal__head">
          <div>
            <h2 id={titleId} className="capi-modal__title">{title}</h2>
            {description ? <p id={descId} className="capi-modal__desc">{description}</p> : null}
          </div>
          <button type="button" className="capi-iconbtn capi-iconbtn--ghost" aria-label="Fechar" onClick={onClose}>
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        {children ? <div className="capi-modal__body">{children}</div> : null}
        {footer ? <div className="capi-modal__foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
