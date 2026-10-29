"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { fetchPending, type NotificationDTO } from "@/lib/notifications-client"

export function PendenciasList() {
  const [items, setItems] = useState<NotificationDTO[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchPending()
      .then((d) => setItems(d.notifications))
      .catch(() => setError(true))
  }, [])

  if (error) {
    return <p style={{ color: "#DC2626", fontSize: "14px" }}>Não foi possível carregar as pendências.</p>
  }
  if (!items) return <p style={{ color: "var(--stone-500)", fontSize: "14px" }}>Carregando…</p>
  if (items.length === 0) {
    return <p style={{ color: "var(--stone-500)", fontSize: "14px" }}>Nenhuma pendência</p>
  }

  return (
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
          {n.link && n.link !== "/pendencias" && (
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
  )
}
