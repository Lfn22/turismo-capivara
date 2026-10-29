"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  BookingList,
  boxStyle,
  callProxy,
  primaryBtn,
  secondaryBtn,
  textStyle,
  type MembershipBooking,
} from "./membership-shared"

type State = "NOT_GUIDE" | "UNVERIFIED" | "OUT" | "IN" | "IN_WITH_BOOKINGS"

export default function DestinationMembershipButton({ destinationSlug }: { destinationSlug: string }) {
  const { status } = useSession()
  const [state, setState] = useState<State>("NOT_GUIDE")
  const [bookings, setBookings] = useState<MembershipBooking[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const base = `/destinations/${destinationSlug}`

  const load = useCallback(
    () =>
      callProxy(`${base}/membership`, "GET").then(({ res, data }) => {
        if (!res.ok || !data) return
        const d = data as unknown as { state: State; bookings?: MembershipBooking[] }
        setState(d.state)
        setBookings(d.bookings ?? [])
      }),
    [base],
  )

  useEffect(() => {
    if (status !== "authenticated") return
    void load()
  }, [status, load])

  async function act(method: "POST" | "DELETE") {
    if (method === "DELETE" && !window.confirm("Deseja mesmo deixar de atuar neste destino?")) return
    setBusy(true)
    setError(null)
    try {
      const { res, data } = await callProxy(`${base}/guides/me`, method)
      if (res.status === 409 && data?.bookings) {
        setBookings(data.bookings)
        setState("IN_WITH_BOOKINGS")
        return
      }
      if (!res.ok) {
        setError(data?.message ?? "Não foi possível concluir a ação.")
        return
      }
      await load()
    } catch {
      setError("Não foi possível concluir a ação.")
    } finally {
      setBusy(false)
    }
  }

  if (status !== "authenticated" || state === "NOT_GUIDE") return null

  return (
    <div style={boxStyle}>
      {state === "UNVERIFIED" && (
        <button type="button" disabled style={{ ...primaryBtn, opacity: 0.5, cursor: "not-allowed" }}>
          Disponível após verificação
        </button>
      )}
      {state === "OUT" && (
        <button type="button" disabled={busy} onClick={() => act("POST")} style={primaryBtn}>
          Quero atuar neste destino
        </button>
      )}
      {(state === "IN" || state === "IN_WITH_BOOKINGS") && (
        <>
          <p style={{ ...textStyle, fontWeight: 600 }}>Você atua aqui ✓</p>
          <button
            type="button"
            disabled={busy || state === "IN_WITH_BOOKINGS"}
            onClick={() => act("DELETE")}
            style={{ ...secondaryBtn, opacity: state === "IN_WITH_BOOKINGS" ? 0.5 : 1 }}
          >
            Sair
          </button>
          {state === "IN_WITH_BOOKINGS" && <BookingList bookings={bookings} />}
        </>
      )}
      {error && <p style={{ ...textStyle, color: "#b91c1c" }}>{error}</p>}
    </div>
  )
}
