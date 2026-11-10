"use client"
import { useEffect, useRef, useState } from "react"
import type { RejectInput } from "@/lib/notification-actions"

type Code = "ILEGIVEL" | "VENCIDO" | "NOME_DIFERENTE" | "OUTRO"

const CODES: { value: Code; label: string }[] = [
  { value: "ILEGIVEL", label: "Documento ilegível" },
  { value: "VENCIDO", label: "Documento vencido" },
  { value: "NOME_DIFERENTE", label: "Nome diferente do documento" },
  { value: "OUTRO", label: "Outro" },
]

export function RejectReasonDialog({
  kind,
  onCancel,
  onSubmit,
}: {
  kind: "guide-codes" | "free-text"
  onCancel: () => void
  onSubmit: (input: RejectInput) => Promise<void>
}) {
  const [code, setCode] = useState<Code>("ILEGIVEL")
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("input, textarea")?.focus()
  }, [])

  const needsText = kind === "free-text" || code === "OUTRO"

  async function submit() {
    const trimmed = text.trim()
    if (needsText && (trimmed.length < 3 || trimmed.length > 300)) {
      setError("Informe o motivo com 3 a 300 caracteres.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit(
        kind === "free-text"
          ? { reason: trimmed }
          : { reasonCode: code, ...(code === "OUTRO" ? { text: trimmed } : {}) },
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir a ação.")
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(31,14,8,0.6)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
    >
      <div
        ref={dialogRef}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation()
            if (!busy) onCancel()
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-reason-title"
        style={{
          background: "white",
          color: "var(--stone-900)",
          borderRadius: "8px",
          padding: "24px",
          width: "100%",
          maxWidth: "440px",
          textAlign: "left",
        }}
      >
        <h2 id="reject-reason-title" style={{ fontSize: "18px", margin: "0 0 12px" }}>
          Recusar
        </h2>
        {kind === "guide-codes" && (
          <fieldset style={{ border: "none", padding: 0, margin: "0 0 12px" }}>
            {CODES.map((c) => (
              <label key={c.value} style={{ display: "flex", gap: "8px", padding: "4px 0", fontSize: "14px" }}>
                <input
                  type="radio"
                  name="reject-code"
                  value={c.value}
                  checked={code === c.value}
                  onChange={() => setCode(c.value)}
                />
                {c.label}
              </label>
            ))}
          </fieldset>
        )}
        {needsText && (
          <div style={{ marginBottom: "12px" }}>
            <label htmlFor="reject-text" style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
              Motivo
            </label>
            <textarea
              id="reject-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={300}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 12px",
                border: "1px solid var(--stone-300)",
                borderRadius: "4px",
                fontSize: "16px",
                fontFamily: "inherit",
              }}
            />
          </div>
        )}
        {error && (
          <p role="alert" style={{ fontSize: "14px", color: "#DC2626", margin: "0 0 12px" }}>
            {error}
          </p>
        )}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: "8px 20px",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 600,
              background: "transparent",
              color: "var(--stone-700)",
              border: "1px solid var(--stone-300)",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            style={{
              padding: "8px 20px",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 600,
              background: busy ? "var(--stone-400)" : "#DC2626",
              color: "white",
              border: "none",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Recusando…" : "Confirmar recusa"}
          </button>
        </div>
      </div>
    </div>
  )
}
