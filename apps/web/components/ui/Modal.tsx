"use client"
import { useEffect, useRef } from "react"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  titleId?: string
  children: React.ReactNode
  maxWidth?: number
}

export function Modal({ open, onClose, title, titleId = "modal-title", children, maxWidth = 480 }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      dialogRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(31,14,8,0.6)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{
          background: "white",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: `${maxWidth}px`,
          width: "100%",
          position: "relative",
          outline: "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão fechar */}
        <button
          onClick={onClose}
          aria-label="Fechar modal"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "transparent",
            border: "none",
            fontSize: "24px",
            color: "var(--stone-500)",
            cursor: "pointer",
            lineHeight: 1,
            padding: "4px",
          }}
        >
          ×
        </button>

        {/* Título */}
        <h2
          id={titleId}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "24px",
            color: "var(--stone-900)",
            marginBottom: "16px",
            paddingRight: "32px",
          }}
        >
          {title}
        </h2>

        {children}
      </div>
    </div>
  )
}
