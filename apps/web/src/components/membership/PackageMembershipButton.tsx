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

type State =
  | "NOT_GUIDE"
  | "UNVERIFIED"
  | "CONDUCTOR"
  | "OUT"
  | "PENDING"
  | "REJECTED"
  | "IN"
  | "IN_WITH_BOOKINGS"

type Membership = {
  state: State
  ownerName: string | null
  rejectionReason: string | null
  bookings: MembershipBooking[]
}

export default function PackageMembershipButton({ packageId }: { packageId: string }) {
  const { status } = useSession()
  const [m, setM] = useState<Membership>({ state: "NOT_GUIDE", ownerName: null, rejectionReason: null, bookings: [] })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const base = `/packages/${packageId}`

  const load = useCallback(
    () =>
      callProxy(`${base}/membership`, "GET").then(({ res, data }) => {
        if (!res.ok || !data) return
        const d = data as unknown as Partial<Membership> & { state: State }
        setM({
          state: d.state,
          ownerName: d.ownerName ?? null,
          rejectionReason: d.rejectionReason ?? null,
          bookings: d.bookings ?? [],
        })
      }),
    [base],
  )

  useEffect(() => {
    if (status !== "authenticated") return
    void load()
  }, [status, load])

  async function act(method: "POST" | "DELETE", confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(true)
    setError(null)
    try {
      const { res, data } = await callProxy(`${base}/guides/me`, method)
      if (res.status === 409 && data?.bookings) {
        const list = data.bookings
        setM((prev) => ({ ...prev, state: "IN_WITH_BOOKINGS", bookings: list }))
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

  if (status !== "authenticated" || m.state === "NOT_GUIDE") return null

  const requestBtn = (label: string) => (
    <button type="button" disabled={busy} onClick={() => act("POST")} style={primaryBtn}>
      {label}
    </button>
  )

  return (
    <div style={{ ...boxStyle, alignItems: "flex-start" }}>
      {m.state === "UNVERIFIED" && (
        <button type="button" disabled style={{ ...primaryBtn, opacity: 0.5, cursor: "not-allowed" }}>
          Disponível após verificação
        </button>
      )}
      {m.state === "CONDUCTOR" && <p style={textStyle}>Você é o guia responsável por este roteiro</p>}
      {m.state === "OUT" && requestBtn("Quero atuar neste roteiro")}
      {m.state === "PENDING" && (
        <>
          <p style={textStyle}>Pedido enviado · aguardando {m.ownerName}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => act("DELETE", "Deseja cancelar o pedido?")}
            style={secondaryBtn}
          >
            Cancelar pedido
          </button>
        </>
      )}
      {m.state === "REJECTED" && (
        <>
          <p style={textStyle}>Pedido recusado: {m.rejectionReason}</p>
          {requestBtn("Pedir de novo")}
        </>
      )}
      {(m.state === "IN" || m.state === "IN_WITH_BOOKINGS") && (
        <>
          <p style={{ ...textStyle, fontWeight: 600 }}>Você atua aqui ✓</p>
          <button
            type="button"
            disabled={busy || m.state === "IN_WITH_BOOKINGS"}
            onClick={() => act("DELETE", "Deseja mesmo deixar de atuar neste roteiro?")}
            style={{ ...secondaryBtn, opacity: m.state === "IN_WITH_BOOKINGS" ? 0.5 : 1 }}
          >
            Sair
          </button>
          {m.state === "IN_WITH_BOOKINGS" && <BookingList bookings={m.bookings} />}
        </>
      )}
      {error && <p style={{ ...textStyle, color: "#b91c1c" }}>{error}</p>}
    </div>
  )
}
