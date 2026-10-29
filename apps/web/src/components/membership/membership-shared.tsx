"use client"

import type { CSSProperties } from "react"

export type MembershipBooking = { id: string; startsAt: string; packageName: string }

export const BLOCKED_MESSAGE = "Você tem reservas pendentes, fale com o admin"

export async function callProxy(path: string, method: "GET" | "POST" | "DELETE") {
  const res = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, { method, cache: "no-store" })
  let data: { message?: string; bookings?: MembershipBooking[] } | null = null
  try {
    data = await res.json()
  } catch {
    // resposta sem corpo (ex.: 204)
  }
  return { res, data }
}

function formatDay(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso))
}

export const boxStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.6rem",
  margin: "1.25rem 0 0",
}

export const primaryBtn: CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--stone-900, #1c1917)",
  background: "var(--ochre, #c8961c)",
  border: "none",
  borderRadius: 2,
  padding: "0.8rem 1.6rem",
  cursor: "pointer",
}

export const secondaryBtn: CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "var(--stone-700, #44403c)",
  background: "transparent",
  border: "1px solid var(--stone-300, #d6d3d1)",
  borderRadius: 2,
  padding: "0.5rem 1rem",
  cursor: "pointer",
}

export const textStyle: CSSProperties = { fontSize: "0.9rem", color: "var(--stone-600, #57534e)", margin: 0 }

export function BookingList({ bookings }: { bookings: MembershipBooking[] }) {
  return (
    <>
      <p style={{ ...textStyle, color: "var(--stone-700, #44403c)" }}>{BLOCKED_MESSAGE}</p>
      <ul style={{ ...textStyle, listStyle: "none", padding: 0, margin: 0 }}>
        {bookings.map((b) => (
          <li key={b.id}>
            {formatDay(b.startsAt)} · {b.packageName}
          </li>
        ))}
      </ul>
    </>
  )
}
