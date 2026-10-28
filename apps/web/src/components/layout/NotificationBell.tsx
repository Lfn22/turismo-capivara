"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  fetchNotifications,
  fetchSummary,
  markAllRead,
  markRead,
  type NotificationDTO,
} from "@/lib/notifications-client"

const POLL_MS = 60_000

const badgeStyle = (bg: string): React.CSSProperties => ({
  minWidth: "16px",
  height: "16px",
  padding: "0 4px",
  borderRadius: "8px",
  background: bg,
  color: "white",
  fontSize: "11px",
  fontWeight: 700,
  lineHeight: "16px",
  textAlign: "center",
})

export function NotificationBell({ role }: { role?: string }) {
  const router = useRouter()
  const [summary, setSummary] = useState({ unread: 0, pending: 0 })
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationDTO[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const refreshSummary = useCallback(() => {
    // mantém o último valor conhecido em caso de falha
    fetchSummary().then(setSummary, () => {})
  }, [])

  // Polling a cada 60 s; pausado com a aba oculta
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    function start() {
      if (timer) return
      timer = setInterval(refreshSummary, POLL_MS)
    }
    function stop() {
      if (timer) clearInterval(timer)
      timer = null
    }
    function onVisibility() {
      if (document.visibilityState === "visible") {
        refreshSummary()
        start()
      } else {
        stop()
      }
    }
    if (document.visibilityState === "visible") {
      refreshSummary()
      start()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [refreshSummary])

  const loadPage = useCallback(async (cursor?: string) => {
    setLoading(true)
    setError(false)
    try {
      const data = await fetchNotifications(cursor)
      setItems((prev) => (cursor ? [...prev, ...data.notifications] : data.notifications))
      setNextCursor(data.nextCursor)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  async function onItemClick(n: NotificationDTO) {
    try {
      await markRead(n.id)
    } catch {
      // navegação segue mesmo se falhar
    }
    setItems((prev) =>
      prev.map((i) => (i.id === n.id && !i.readAt ? { ...i, readAt: new Date().toISOString() } : i)),
    )
    refreshSummary()
    if (n.link) {
      setOpen(false)
      router.push(n.link)
    }
  }

  async function onMarkAll() {
    try {
      await markAllRead()
      const now = new Date().toISOString()
      setItems((prev) => prev.map((i) => (i.readAt ? i : { ...i, readAt: now })))
    } catch {
      // ignora
    }
    refreshSummary()
  }

  const emptyText =
    role === "CONDUTOR"
      ? "Nenhuma novidade. Complete seu perfil para ser encontrado"
      : "Nenhuma novidade"

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <style>{`
        .notif-panel { position: absolute; right: 0; top: 40px; width: 360px; }
        @media (max-width: 767px) {
          .notif-panel { position: fixed; left: 0; right: 0; top: var(--userbar-h, 40px); width: auto; }
        }
      `}</style>
      <button
        type="button"
        aria-label="Notificações"
        aria-expanded={open}
        onClick={() => {
          if (!open) loadPage()
          setOpen((v) => !v)
        }}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--stone-50)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          minHeight: "40px",
          padding: "0 4px",
          fontSize: "16px",
        }}
      >
        <span aria-hidden="true">🔔</span>
        {summary.unread > 0 && (
          <span style={badgeStyle("var(--ochre)")}>{summary.unread > 9 ? "9+" : summary.unread}</span>
        )}
        {summary.pending > 0 && (
          <span title="Pendências" style={badgeStyle("#DC2626")}>
            {summary.pending > 9 ? "9+" : summary.pending}
          </span>
        )}
      </button>
      {open && (
        <div
          className="notif-panel"
          style={{
            background: "var(--stone-50)",
            color: "var(--stone-900)",
            border: "1px solid var(--stone-200)",
            borderRadius: "4px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            maxHeight: "70vh",
            overflowY: "auto",
            zIndex: 70,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              borderBottom: "1px solid var(--stone-200)",
            }}
          >
            <strong style={{ fontSize: "14px" }}>Notificações</strong>
            <button
              type="button"
              onClick={onMarkAll}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ochre)",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Marcar todas como lidas
            </button>
          </div>
          {error && (
            <p style={{ padding: "14px", fontSize: "14px", color: "#DC2626" }}>
              Não foi possível carregar as notificações.
            </p>
          )}
          {!error && !loading && items.length === 0 && (
            <p style={{ padding: "14px", fontSize: "14px", color: "var(--stone-500)" }}>{emptyText}</p>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onItemClick(n)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                border: "none",
                borderBottom: "1px solid var(--stone-200)",
                background: n.readAt ? "transparent" : "white",
                borderLeft: n.readAt ? "3px solid transparent" : "3px solid var(--ochre)",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                color: "var(--stone-900)",
              }}
            >
              <span style={{ display: "block", fontSize: "14px", fontWeight: n.readAt ? 400 : 700 }}>
                {n.title}
                {n.count > 1 ? ` (${n.count})` : ""}
              </span>
              <span style={{ display: "block", fontSize: "13px", color: "var(--stone-500)" }}>{n.body}</span>
              {n.resolvedAt && (
                <span style={{ display: "block", fontSize: "12px", color: "var(--stone-500)", marginTop: "2px" }}>
                  Resolvido por {n.resolvedByName}
                </span>
              )}
            </button>
          ))}
          {loading && (
            <p style={{ padding: "14px", fontSize: "14px", color: "var(--stone-500)" }}>Carregando…</p>
          )}
          {nextCursor && !loading && (
            <button
              type="button"
              onClick={() => loadPage(nextCursor)}
              style={{
                display: "block",
                width: "100%",
                padding: "10px",
                background: "transparent",
                border: "none",
                color: "var(--ochre)",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Carregar mais
            </button>
          )}
        </div>
      )}
    </div>
  )
}
