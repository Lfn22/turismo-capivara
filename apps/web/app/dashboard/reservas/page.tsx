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

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pendente", className: "bg-yellow-100 text-yellow-700" },
  CONFIRMED: { label: "Confirmada", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelada", className: "bg-red-100 text-red-700" },
  CHECKED_IN: { label: "Check-in", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Concluida", className: "bg-gray-100 text-gray-600" },
  NO_SHOW: { label: "Nao compareceu", className: "bg-red-50 text-red-400" },
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
      .then((data) => {
        if (data) setBookings(data)
      })
      .catch(() => setErro("Erro ao carregar reservas."))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadBookings()
  }, [])

  async function handleConfirm(bookingId: string) {
    setActionLoading(bookingId)
    try {
      const res = await fetch(
        getBaseUrl() + "/tenants/serra-viva/bookings/" + bookingId + "/confirm",
        {
          method: "PATCH",
          headers: { Authorization: "Bearer " + getToken() },
        }
      )
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: "CONFIRMED" } : b))
        )
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
        {
          method: "PATCH",
          headers: { Authorization: "Bearer " + getToken() },
        }
      )
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: "CANCELLED" } : b))
        )
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
      <div className="min-h-screen bg-[#F5EFE6] flex items-center justify-center">
        <p className="text-[#6B5B45] text-sm">Carregando reservas...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5EFE6]">
      <div className="bg-white border-b border-[#E8D5B7] px-4 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1A1A1A]">Reservas</h1>
            <p className="text-[#6B5B45] text-sm mt-0.5">
              {bookings.length} reserva{bookings.length !== 1 ? "s" : ""} encontrada{bookings.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("token")
              window.location.href = "/dashboard"
            }}
            className="text-sm text-[#6B5B45] hover:text-red-500 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-6">
            {erro}
          </div>
        )}

        {bookings.length === 0 && !erro && (
          <div className="text-center py-16">
            <p className="text-[#6B5B45] text-sm">Nenhuma reserva encontrada.</p>
          </div>
        )}

        <div className="grid gap-3">
          {bookings.map((booking) => {
            const status = STATUS_LABEL[booking.status] ?? STATUS_LABEL.PENDING
            const isActing = actionLoading === booking.id
            const canAct = ["PENDING", "CONFIRMED"].includes(booking.status)

            return (
              <div
                key={booking.id}
                className="bg-white border border-[#E8D5B7] rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={
                        "text-xs font-medium px-2 py-0.5 rounded-full " + status.className
                      }>
                        {status.label}
                      </span>
                      <span className="text-xs text-[#9C8470]">
                        {formatDate(booking.createdAt)}
                      </span>
                    </div>
                    <p className="font-semibold text-[#1A1A1A]">{booking.customerName}</p>
                    <p className="text-sm text-[#6B5B45]">{booking.customerEmail}</p>
                    <p className="text-sm text-[#6B5B45]">{booking.customerPhone}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      {booking.slot?.package?.name}
                    </p>
                    <p className="text-xs text-[#9C8470] mt-0.5">
                      {formatDate(booking.slot?.startsAt)} · {booking.pax} pessoa{booking.pax !== 1 ? "s" : ""}
                    </p>
                    <p className="text-sm font-bold text-orange-600 mt-1">
                      R$ {(Number(booking.slot?.package?.price) * booking.pax).toFixed(2)}
                    </p>
                  </div>
                </div>

                {canAct && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-[#F0E6D3]">
                    {booking.status === "PENDING" && (
                      <button
                        onClick={() => handleConfirm(booking.id)}
                        disabled={isActing}
                        className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-sm font-medium py-2 rounded-xl transition-colors"
                      >
                        {isActing ? "..." : "Confirmar"}
                      </button>
                    )}
                    <button
                      onClick={() => handleCancel(booking.id)}
                      disabled={isActing}
                      className="flex-1 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-sm font-medium py-2 rounded-xl transition-colors"
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