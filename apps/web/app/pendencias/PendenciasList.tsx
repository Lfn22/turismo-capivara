"use client"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { NotificationActions } from "@/src/components/notifications/NotificationActions"
import { fetchPending, type NotificationDTO } from "@/lib/notifications-client"

export function PendenciasList() {
  const [items, setItems] = useState<NotificationDTO[] | null>(null)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const d = await fetchPending()
      setItems(d.notifications)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
    reload()
  }, [reload])

  if (error) {
    return <p style={{ color: "#DC2626", fontSize: "14px" }}>Não foi possível carregar as pendências.</p>
  }
  if (!items) return <p style={{ color: "var(--stone-500)", fontSize: "14px" }}>Carregando…</p>
  if (items.length === 0) {
    return (
      <>
    {notice && (
      <p role="alert" style={{ fontSize: "14px", color: "#DC2626", background: "#FEF2F2", padding: "8px 12px", borderRadius: "4px", margin: "0 0 12px" }}>
        {notice}
      </p>
    )}
        <p style={{ color: "var(--stone-500)", fontSize: "14px" }}>Nenhuma pendência</p>
      </>
    )
  }

  return (
    <>
    {notice && (
      <p role="alert" style={{ fontSize: "14px", color: "#DC2626", background: "#FEF2F2", padding: "8px 12px", borderRadius: "4px", margin: "0 0 12px" }}>
        {notice}
      </p>
    )}
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "12px" }}>
      {items.map((n) => (
        <li
          key={n.id}
          style={{
            background: "white",
            border: "1px solid var(--stone-200)",
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--stone-900)", margin: 0 }}>{n.title}</h2>
          <p style={{ fontSize: "14px", color: "var(--stone-700)", margin: "6px 0" }}>{n.body}</p>
          <p style={{ fontSize: "12px", color: "var(--stone-500)", margin: "0 0 8px" }}>
            {new Date(n.updatedAt).toLocaleString("pt-BR")}
          </p>
          <NotificationActions n={n} onDone={reload} onNotice={setNotice} />
          {n.link && n.link !== "/pendencias" && !n.link.startsWith("/pendencias?") && (
            <Link
              href={n.link}
              style={{
                display: "inline-block",
                padding: "8px 16px",
                background: "var(--ochre)",
                color: "white",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Abrir
            </Link>
          )}
        </li>
      ))}
    </ul>
    </>
  )
}
