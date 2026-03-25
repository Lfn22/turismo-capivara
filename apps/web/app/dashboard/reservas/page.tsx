"use client"

import { useState, useEffect } from "react"

interface Booking {
  id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  pax: number
  status: string
  createdAt: string
  slot: {
    startsAt: string
    package: {
      name: string
      price: string | number
    }
  }
}

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  PENDING: { label: "Pendente", bg: "#FEF9EC", color: "#B45309" },
  CONFIRMED: { label: "Confirmada", bg: "#F0FDF4", color: "#15803D" },
  CANCELLED: { label: "Cancelada", bg: "#FEF2F2", color: "#DC2626" },
  CHECKED_IN: { label: "Check-in", bg: "#EFF6FF", color: "#1D4ED8" },
  COMPLETED: { label: "Concluída", bg: "var(--stone-100)", color: "var(--stone-500)" },
  NO_SHOW: { label: "Não compareceu", bg: "#FEF2F2", color: "#9CA3AF" },
}

export default function ReservasPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  function getToken() {
    return localStorage.getItem("token") ?? ""
  }

  function getBaseUrl() {
    return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
  }

  function loadBookings() {
    const token = getToken()
    if (!token) {
      window.location.href = "/dashboard"
      return
    }

    fetch(getBaseUrl() + "/tenants/serra-viva/bookings", {
      headers: { Authorization: "Bearer " + token },
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("token")
          window.location.href = "/dashboard"
          return null
        }
        return res.json()
      })
      .then((data) => { if (data) setBookings(data) })
      .catch(() => setErro("Erro ao carregar reservas."))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadBookings() }, [])

  async function handleConfirm(bookingId: string) {
    setActionLoading(bookingId)
    try {
      const res = await fetch(
        getBaseUrl() + "/tenants/serra-viva/bookings/" + bookingId + "/confirm",
        { method: "PATCH", headers: { Authorization: "Bearer " + getToken() } }
      )
      if (res.ok) {
        setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: "CONFIRMED" } : b))
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCancel(bookingId: string) {
    if (!confirm("Cancelar esta reserva?")) return
    setActionLoading(bookingId)
    try {
      const res = await fetch(
        getBaseUrl() + "/tenants/serra-viva/bookings/" + bookingId + "/cancel",
        { method: "PATCH", headers: { Authorization: "Bearer " + getToken() } }
      )
      if (res.ok) {
        setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: "CANCELLED" } : b))
      }
    } finally {
      setActionLoading(null)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      timeZone: "America/Fortaleza",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--stone-900)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--stone-500)", fontSize: "14px", letterSpacing: "0.06em" }}>Carregando reservas...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--stone-50)" }}>

      <nav style={{
        background: "var(--stone-900)",
        borderBottom: "1px solid var(--stone-700)",
        padding: "20px 24px",
      }}>
        <div style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <p style={{
              fontFamily: "var(--font-display)",
              fontSize: "18px",
              color: "var(--stone-100)",
              letterSpacing: "-0.02em",
            }}>
              Serra da Capivara
            </p>
            <p style={{ fontSize: "11px", color: "var(--stone-500)", marginTop: "2px", letterSpacing: "0.06em" }}>
              Painel administrativo
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("token")
              window.location.href = "/dashboard"
            }}
            style={{
              background: "transparent",
              border: "1px solid var(--stone-700)",
              color: "var(--stone-400)",
              padding: "8px 16px",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Sair
          </button>
        </div>
      </nav>

      <section style={{
        background: "var(--stone-900)",
        padding: "40px 24px 32px",
        borderBottom: "1px solid var(--stone-700)",
      }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <p style={{ fontSize: "11px", color: "var(--ochre-light)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px" }}>
              Gestão
            </p>
            <h1 style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(24px, 4vw, 40px)",
              color: "var(--stone-50)",
              letterSpacing: "-0.03em",
            }}>
              Reservas
            </h1>
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            {["PENDING", "CONFIRMED", "CANCELLED"].map((s) => {
              const count = bookings.filter((b) => b.status === s).length
              const st = STATUS[s]
              return (
                <div key={s} style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--stone-700)",
                  borderRadius: "6px",
                  padding: "12px 20px",
                  textAlign: "center",
                }}>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "24px", color: "var(--stone-100)", letterSpacing: "-0.02em" }}>
                    {count}
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--stone-500)", marginTop: "2px", letterSpacing: "0.06em" }}>
                    {st.label}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>
        {erro && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "4px", padding: "12px 16px", fontSize: "14px", color: "#DC2626", marginBottom: "24px" }}>
            {erro}
          </div>
        )}

        {bookings.length === 0 && !erro && (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <p style={{ color: "var(--stone-400)", fontSize: "14px" }}>Nenhuma reserva encontrada.</p>
          </div>
        )}

        <div style={{ display: "grid", gap: "12px" }}>
          {bookings.map((booking) => {
            const st = STATUS[booking.status] ?? STATUS.PENDING
            const isActing = actionLoading === booking.id
            const total = (Number(booking.slot?.package?.price) * booking.pax).toFixed(2)

            return (
              <div key={booking.id} style={{
                background: "white",
                border: "1px solid var(--stone-200)",
                borderRadius: "8px",
                padding: "24px 28px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "24px", flexWrap: "wrap" }}>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                      <span style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        background: st.bg,
                        color: st.color,
                        padding: "3px 10px",
                        borderRadius: "3px",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}>
                        {st.label}
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--stone-400)" }}>
                        {formatDate(booking.createdAt)}
                      </span>
                    </div>

                    <p style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--stone-900)", letterSpacing: "-0.01em", marginBottom: "4px" }}>
                      {booking.customerName}
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--stone-500)", marginBottom: "2px" }}>
                      {booking.customerEmail}
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--stone-500)" }}>
                      {booking.customerPhone}
                    </p>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--stone-700)", marginBottom: "4px" }}>
                      {booking.slot?.package?.name}
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--stone-400)", marginBottom: "4px" }}>
                      {formatDate(booking.slot?.startsAt)} · {booking.pax} pessoa{booking.pax !== 1 ? "s" : ""}
                    </p>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "var(--stone-900)", letterSpacing: "-0.02em" }}>
                      R$ {total}
                    </p>
                  </div>
                </div>

                {["PENDING", "CONFIRMED"].includes(booking.status) && (
                  <div style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "20px",
                    paddingTop: "20px",
                    borderTop: "1px solid var(--stone-100)",
                  }}>
                    {booking.status === "PENDING" && (
                      <button
                        onClick={() => handleConfirm(booking.id)}
                        disabled={isActing}
                        style={{
                          flex: 1,
                          background: isActing ? "var(--stone-100)" : "var(--stone-900)",
                          color: isActing ? "var(--stone-400)" : "white",
                          border: "none",
                          padding: "10px 16px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "600",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          cursor: isActing ? "not-allowed" : "pointer",
                          transition: "background 0.2s",
                        }}
                      >
                        {isActing ? "..." : "Confirmar"}
                      </button>
                    )}
                    <button
                      onClick={() => handleCancel(booking.id)}
                      disabled={isActing}
                      style={{
                        flex: 1,
                        background: "transparent",
                        color: isActing ? "var(--stone-300)" : "#DC2626",
                        border: "1px solid",
                        borderColor: isActing ? "var(--stone-200)" : "#FECACA",
                        padding: "10px 16px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        cursor: isActing ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {isActing ? "..." : "Cancelar"}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}