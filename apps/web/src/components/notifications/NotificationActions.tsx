"use client"
import { useState } from "react"
import { RejectReasonDialog } from "./RejectReasonDialog"
import {
  actionFor,
  AlreadyDecidedError,
  type RejectInput,
} from "@/lib/notification-actions"
import type { NotificationDTO } from "@/lib/notifications-client"

const btn = (bg: string): React.CSSProperties => ({
  background: bg,
  color: "white",
  padding: "6px 12px",
  borderRadius: "4px",
  fontSize: "13px",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  minHeight: "36px",
})

/** Botões Aprovar/Recusar de uma notificação; null quando não há ação possível. */
export function NotificationActions({
  n,
  onDone,
  onNotice,
}: {
  n: NotificationDTO
  onDone: () => void | Promise<void>
  onNotice: (message: string | null) => void
}) {
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const action = n.actionKey && !n.resolvedAt ? actionFor(n.actionKey, n.link) : null
  if (!action) return null

  // 409 vira aviso; em qualquer caso a lista e o resumo são recarregados.
  async function run(fn: () => Promise<void>) {
    onNotice(null)
    try {
      await fn()
    } catch (e) {
      if (e instanceof AlreadyDecidedError) onNotice("Este pedido já foi decidido.")
      else throw e
    }
    window.dispatchEvent(new Event("notifications:changed"))
    await onDone()
  }

  async function approve() {
    setBusy(true)
    try {
      await run(action!.approve)
    } catch (e) {
      onNotice(e instanceof Error ? e.message : "Não foi possível concluir a ação.")
    } finally {
      setBusy(false)
    }
  }

  async function reject(input: RejectInput) {
    await run(() => action!.reject(input))
    setRejecting(false)
  }

  return (
    <div style={{ padding: "0 14px 10px" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" disabled={busy} onClick={approve} style={btn("var(--ochre)")}>
          Aprovar
        </button>
        <button type="button" disabled={busy} onClick={() => setRejecting(true)} style={btn("#DC2626")}>
          Recusar
        </button>
      </div>
      {rejecting && (
        <RejectReasonDialog
          kind={action.rejectKind}
          onCancel={() => setRejecting(false)}
          onSubmit={reject}
        />
      )}
    </div>
  )
}
