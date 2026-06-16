"use client"
import { use, useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { StatusBadge } from "@/components/ui/StatusBadge"
import BackButton from "@/src/components/ui/BackButton"
import CancelDialog from "@/src/components/ui/CancelDialog"
import EmptyState from "@/src/components/ui/EmptyState"

interface Booking {
  id: string
  customerName: string
  customerEmail: string
  pax: number
  status: string
  createdAt: string
  slot: {
    startsAt: string
    package: { name: string; price: string | number }
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function ReservasPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null)

  const bookingsEndpoint =
    role === "CONDUTOR"
      ? `/tenants/${slug}/guides/me/bookings`
      : `/tenants/${slug}/bookings`

  function loadBookings() {
    setLoading(true)
    setError(null)
    fetch(`/api/proxy?path=${bookingsEndpoint}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => setBookings(data.bookings ?? []))
      .catch(() => setError("Erro ao carregar dados. Tente novamente."))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!role) return
    loadBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, role])

  async function handleConfirm(id: string) {
    setActionLoading(id)
    const prevBookings = bookings
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "CONFIRMED" } : b))
    )
    try {
      const res = await fetch(`/api/proxy?path=/tenants/${slug}/bookings/${id}/confirm`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao processar.")
      }
      toast.success("Reserva confirmada.")
    } catch (err) {
      setBookings(prevBookings)
      toast.error(err instanceof Error ? err.message : "Erro ao processar.")
    } finally {
      setActionLoading(null)
    }
  }

  function handleCancel(id: string) {
    setPendingCancelId(id)
    setCancelDialogOpen(true)
  }

  async function executeCancel() {
    if (!pendingCancelId) return
    const id = pendingCancelId
    setCancelDialogOpen(false)
    setPendingCancelId(null)
    setActionLoading(id)
    const prevBookings = bookings
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "CANCELLED" } : b))
    )
    try {
      const res = await fetch(`/api/proxy?path=/tenants/${slug}/bookings/${id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao processar.")
      }
      toast.success("Reserva cancelada.")
    } catch (err) {
      setBookings(prevBookings)
      toast.error(err instanceof Error ? err.message : "Erro ao processar.")
    } finally {
      setActionLoading(null)
    }
  }

  const filtered =
    statusFilter === "ALL"
      ? bookings
      : bookings.filter((b) => b.status === statusFilter)

  return (
    <>
      <BackButton />

      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "11px",
              color: "var(--ochre)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Painel do Guia
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "24px",
              color: "var(--stone-900)",
              lineHeight: 1.2,
            }}
          >
            Reservas
          </h1>
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filtrar por status"
          style={{
            padding: "8px 12px",
            border: "1px solid var(--stone-300)",
            borderRadius: "4px",
            fontSize: "14px",
            color: "var(--stone-800)",
            background: "white",
            cursor: "pointer",
          }}
        >
          <option value="ALL">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="CONFIRMED">Confirmada</option>
          <option value="CANCELLED">Cancelada</option>
          <option value="CHECKED_IN">Check-in</option>
          <option value="COMPLETED">Concluída</option>
        </select>
      </div>

      {/* Content */}
      <div
        style={{
          background: "white",
          border: "1px solid var(--stone-200)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: "24px" }}>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                style={{
                  height: "48px",
                  marginBottom: "8px",
                  borderRadius: "4px",
                  background:
                    "linear-gradient(90deg, var(--stone-100) 25%, var(--stone-200) 50%, var(--stone-100) 75%)",
                  backgroundSize: "200%",
                  animation: "shimmer 1.5s infinite",
                }}
              />
            ))}
          </div>
        ) : error ? (
          <p
            style={{
              textAlign: "center",
              padding: "48px 24px",
              fontSize: "16px",
              color: "var(--stone-500)",
              margin: 0,
            }}
          >
            {error}{" "}
            <button
              onClick={loadBookings}
              style={{
                color: "var(--ochre)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Tentar novamente
            </button>
          </p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nenhuma reserva encontrada"
            ctaLabel="Copiar link"
            onCtaClick={() => {
              navigator.clipboard.writeText(window.location.origin + "/" + slug)
              toast.success("Link copiado!")
            }}
          />
        ) : (
          <>
            {/* Mobile card list — visible below 640px */}
            <ul
              className="reservas-card-list"
              style={{ listStyle: "none", margin: 0, padding: "16px", display: "none" }}
            >
              {filtered.map((b) => (
                <li
                  key={b.id}
                  style={{
                    background: "white",
                    border: "1px solid var(--stone-200)",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "var(--stone-900)",
                      }}
                    >
                      {b.customerName}
                    </span>
                    <StatusBadge status={b.status} />
                  </div>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--stone-600)",
                      margin: "0 0 4px",
                    }}
                  >
                    {b.slot?.package?.name}
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--stone-500)",
                      margin: "0 0 12px",
                    }}
                  >
                    {formatDate(b.slot?.startsAt)} &middot; {b.pax} pax
                  </p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {b.status === "PENDING" && (
                      <button
                        onClick={() => handleConfirm(b.id)}
                        disabled={actionLoading === b.id}
                        aria-label={`Confirmar reserva de ${b.customerName}`}
                        style={{
                          background: "var(--ochre)",
                          color: "white",
                          padding: "8px 16px",
                          borderRadius: "4px",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          border: "none",
                          cursor: actionLoading === b.id ? "not-allowed" : "pointer",
                          opacity: actionLoading === b.id ? 0.7 : 1,
                          minHeight: "44px",
                        }}
                      >
                        {actionLoading === b.id ? "..." : "Confirmar"}
                      </button>
                    )}
                    {(b.status === "PENDING" || b.status === "CONFIRMED") && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        disabled={actionLoading === b.id}
                        aria-label={`Cancelar reserva de ${b.customerName}`}
                        style={{
                          background: "#DC2626",
                          color: "white",
                          padding: "8px 16px",
                          borderRadius: "4px",
                          fontSize: "14px",
                          fontWeight: 600,
                          border: "none",
                          cursor: actionLoading === b.id ? "not-allowed" : "pointer",
                          opacity: actionLoading === b.id ? 0.7 : 1,
                          minHeight: "44px",
                        }}
                      >
                        {actionLoading === b.id ? "..." : "Cancelar"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop table — visible at 640px and above */}
            <table
              className="reservas-table"
              style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}
            >
              <thead>
                <tr style={{ background: "var(--stone-100)" }}>
                  {["Data/hora", "Turista", "Roteiro", "Pax", "Status", "Ações"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "var(--stone-700)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => (
                  <tr
                    key={b.id}
                    style={{
                      background: i % 2 === 0 ? "white" : "var(--stone-50)",
                      borderBottom: "1px solid var(--stone-200)",
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>{formatDate(b.slot?.startsAt)}</td>
                    <td style={{ padding: "12px 16px" }}>{b.customerName}</td>
                    <td style={{ padding: "12px 16px" }}>{b.slot?.package?.name}</td>
                    <td style={{ padding: "12px 16px" }}>{b.pax}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <StatusBadge status={b.status} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {b.status === "PENDING" && (
                          <button
                            onClick={() => handleConfirm(b.id)}
                            disabled={actionLoading === b.id}
                            aria-label={`Confirmar reserva de ${b.customerName}`}
                            style={{
                              background: "var(--ochre)",
                              color: "white",
                              padding: "6px 12px",
                              borderRadius: "4px",
                              fontSize: "14px",
                              fontWeight: 600,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                              border: "none",
                              cursor: actionLoading === b.id ? "not-allowed" : "pointer",
                              opacity: actionLoading === b.id ? 0.7 : 1,
                            }}
                          >
                            {actionLoading === b.id ? "..." : "Confirmar"}
                          </button>
                        )}
                        {(b.status === "PENDING" || b.status === "CONFIRMED") && (
                          <button
                            onClick={() => handleCancel(b.id)}
                            disabled={actionLoading === b.id}
                            aria-label={`Cancelar reserva de ${b.customerName}`}
                            style={{
                              background: "#DC2626",
                              color: "white",
                              padding: "6px 12px",
                              borderRadius: "4px",
                              fontSize: "14px",
                              fontWeight: 600,
                              border: "none",
                              cursor: actionLoading === b.id ? "not-allowed" : "pointer",
                              opacity: actionLoading === b.id ? 0.7 : 1,
                            }}
                          >
                            {actionLoading === b.id ? "..." : "Cancelar Reserva"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Cancel confirmation dialog */}
      <CancelDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={executeCancel}
        loading={actionLoading === pendingCancelId}
      />

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (max-width: 639px) {
          .reservas-card-list { display: block !important; }
          .reservas-table { display: none !important; }
        }
      `}</style>
    </>
  )
}
