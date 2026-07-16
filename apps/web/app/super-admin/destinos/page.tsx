"use client"
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Modal } from "@/components/ui/Modal"

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED"

interface Destination {
  id: string
  slug: string
  title: string
  state: string
  heroImageUrl: string | null
  approvalStatus: ApprovalStatus
  rejectionReason: string | null
  createdBy: { name: string; email: string; tenant: { slug: string; name: string } } | null
  createdAt: string
}

type Tab = "TODOS" | ApprovalStatus

const TABS: { key: Tab; label: string }[] = [
  { key: "TODOS", label: "Todos" },
  { key: "PENDING", label: "Pendentes" },
  { key: "APPROVED", label: "Aprovados" },
  { key: "REJECTED", label: "Rejeitados" },
]

const STATUS_BADGE: Record<ApprovalStatus, { label: string; bg: string; color: string }> = {
  PENDING: { label: "PENDENTE", bg: "#FEF9EC", color: "#B45309" },
  APPROVED: { label: "APROVADO", bg: "#F0FDF4", color: "#15803D" },
  REJECTED: { label: "REJEITADO", bg: "#FEF2F2", color: "#DC2626" },
}

const shimmerKeyframes = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`

export default function SuperAdminDestinosPage() {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("TODOS")
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Destination | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [rejectSubmitting, setRejectSubmitting] = useState(false)

  const buildUrl = useCallback(
    (currentOffset: number) => {
      const params = new URLSearchParams({ limit: "20", offset: String(currentOffset) })
      if (activeTab !== "TODOS") params.set("status", activeTab)
      return `/api/admin/destinations?${params}`
    },
    [activeTab],
  )

  const loadDestinations = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    setOffset(0)
    setHasMore(true)
    fetch(buildUrl(0))
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        const list: Destination[] = Array.isArray(data) ? data : (data.destinations ?? [])
        setDestinations(list)
        setHasMore(list.length === 20)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [buildUrl])

  function loadMore() {
    const nextOffset = offset + 20
    setLoadingMore(true)
    fetch(buildUrl(nextOffset))
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        const list: Destination[] = Array.isArray(data) ? data : (data.destinations ?? [])
        setDestinations((prev) => [...prev, ...list])
        setOffset(nextOffset)
        setHasMore(list.length === 20)
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }

  useEffect(() => {
    loadDestinations()
  }, [loadDestinations])

  async function handleApprove(dest: Destination) {
    setActionLoading(dest.id)
    setActionError(null)
    setDestinations((prev) =>
      activeTab === "TODOS"
        ? prev.map((d) => (d.id === dest.id ? { ...d, approvalStatus: "APPROVED" as ApprovalStatus } : d))
        : prev.filter((d) => d.id !== dest.id),
    )
    try {
      const res = await fetch(`/api/admin/destinations/${dest.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: "APPROVED" }),
      })
      if (!res.ok) throw new Error()
      toast.success("Destino aprovado com sucesso.")
    } catch {
      setDestinations((prev) =>
        activeTab === "TODOS"
          ? prev.map((d) => (d.id === dest.id ? { ...d, approvalStatus: dest.approvalStatus } : d))
          : [dest, ...prev],
      )
      setActionError("Não foi possível aprovar o destino. Tente novamente.")
      toast.error("Erro ao processar ação. Tente novamente.")
    } finally {
      setActionLoading(null)
    }
  }

  function handleReject(dest: Destination) {
    setRejectTarget(dest)
    setRejectReason("")
    setRejectError(null)
  }

  async function handleRejectSubmit() {
    if (!rejectTarget || !rejectReason.trim()) {
      setRejectError("Informe o motivo da rejeição.")
      return
    }
    setRejectSubmitting(true)
    setRejectError(null)
    setDestinations((prev) =>
      activeTab === "TODOS"
        ? prev.map((d) =>
            d.id === rejectTarget.id
              ? { ...d, approvalStatus: "REJECTED" as ApprovalStatus, rejectionReason: rejectReason }
              : d,
          )
        : prev.filter((d) => d.id !== rejectTarget.id),
    )
    try {
      const res = await fetch(`/api/admin/destinations/${rejectTarget.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: "REJECTED", rejectionReason: rejectReason }),
      })
      if (!res.ok) throw new Error()
      toast.success("Destino rejeitado.")
      setRejectTarget(null)
      setRejectReason("")
    } catch {
      setDestinations((prev) =>
        activeTab === "TODOS"
          ? prev.map((d) => (d.id === rejectTarget.id ? { ...d, approvalStatus: rejectTarget.approvalStatus, rejectionReason: rejectTarget.rejectionReason } : d))
          : [rejectTarget, ...prev],
      )
      setRejectError("Não foi possível rejeitar o destino. Tente novamente.")
      toast.error("Erro ao processar ação. Tente novamente.")
    } finally {
      setRejectSubmitting(false)
    }
  }

  const emptyMessage =
    activeTab === "TODOS"
      ? "Nenhum destino cadastrado ainda."
      : activeTab === "PENDING"
        ? "Nenhum destino aguardando aprovação."
        : activeTab === "APPROVED"
          ? "Nenhum destino aprovado ainda."
          : "Nenhum destino rejeitado."

  return (
    <>
      <style>{shimmerKeyframes}</style>

      <p
        style={{
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ochre)",
          marginBottom: "8px",
        }}
      >
        SUPER ADMIN
      </p>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "24px",
          fontWeight: 400,
          color: "var(--stone-900)",
          marginBottom: "24px",
        }}
      >
        Destinos
      </h1>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "24px",
          borderBottom: "1px solid var(--stone-200)",
          paddingBottom: "0",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: "none",
              border: "none",
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? "var(--stone-900)" : "var(--stone-500)",
              cursor: "pointer",
              borderBottom: activeTab === tab.key ? "2px solid var(--stone-900)" : "2px solid transparent",
              marginBottom: "-1px",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div
          role="alert"
          style={{
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            borderRadius: "4px",
            padding: "8px 12px",
            marginBottom: "16px",
            fontSize: "14px",
            color: "#DC2626",
          }}
        >
          {actionError}
        </div>
      )}

      {loading ? (
        <div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "72px",
                marginBottom: "8px",
                borderRadius: "6px",
                background: "linear-gradient(90deg, var(--stone-100), var(--stone-50), var(--stone-100))",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s infinite",
              }}
            />
          ))}
        </div>
      ) : loadError ? (
        <div
          role="alert"
          style={{
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            borderRadius: "4px",
            padding: "16px",
            fontSize: "14px",
            color: "#DC2626",
          }}
        >
          Erro ao carregar destinos.{" "}
          <button
            onClick={loadDestinations}
            style={{
              background: "none",
              border: "none",
              color: "#DC2626",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: "14px",
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : destinations.length === 0 ? (
        <p
          style={{
            textAlign: "center",
            padding: "64px 24px",
            fontSize: "16px",
            color: "var(--stone-500)",
          }}
        >
          {emptyMessage}
        </p>
      ) : (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {destinations.map((dest) => {
              const busy = actionLoading === dest.id
              const badge = STATUS_BADGE[dest.approvalStatus]
              return (
                <div
                  key={dest.id}
                  style={{
                    background: "white",
                    border: "1px solid var(--stone-200)",
                    borderRadius: "6px",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    flexWrap: "wrap",
                    opacity: busy ? 0.6 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {dest.heroImageUrl ? (
                    <img
                      src={dest.heroImageUrl}
                      alt={dest.title}
                      style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      aria-hidden
                      style={{ width: "60px", height: "60px", borderRadius: "4px", background: "var(--stone-100)", flexShrink: 0 }}
                    />
                  )}

                  <div style={{ flex: 1, minWidth: "160px" }}>
                    <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--stone-900)", margin: 0 }}>
                      {dest.title}
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--stone-500)", margin: "2px 0 0" }}>
                      {dest.createdBy?.tenant?.slug ?? "—"} &middot; {dest.state}
                    </p>
                    {dest.approvalStatus === "REJECTED" && dest.rejectionReason && (
                      <p style={{ fontSize: "12px", color: "#DC2626", margin: "4px 0 0", fontStyle: "italic" }}>
                        Motivo: {dest.rejectionReason}
                      </p>
                    )}
                  </div>

                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: 600,
                      background: badge.bg,
                      color: badge.color,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {badge.label}
                  </span>

                  {dest.approvalStatus === "PENDING" && (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        onClick={() => handleApprove(dest)}
                        disabled={busy}
                        aria-label={`Aprovar destino ${dest.title}`}
                        style={{
                          background: "#15803D",
                          color: "white",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "4px",
                          fontSize: "14px",
                          fontWeight: 600,
                          cursor: busy ? "not-allowed" : "pointer",
                          minHeight: "44px",
                          minWidth: "80px",
                          opacity: busy ? 0.6 : 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleReject(dest)}
                        disabled={busy}
                        aria-label={`Rejeitar destino ${dest.title}`}
                        style={{
                          background: "#DC2626",
                          color: "white",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "4px",
                          fontSize: "14px",
                          fontWeight: 600,
                          cursor: busy ? "not-allowed" : "pointer",
                          minHeight: "44px",
                          minWidth: "80px",
                          opacity: busy ? 0.6 : 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {hasMore && !loading && !loadError && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: loadingMore ? "#a8a29e" : "#c8961c",
                  background: "transparent",
                  border: "1px solid",
                  borderColor: loadingMore ? "#d6d3d1" : "#c8961c",
                  borderRadius: "2px",
                  padding: "10px 24px",
                  cursor: loadingMore ? "not-allowed" : "pointer",
                }}
              >
                {loadingMore ? "Carregando..." : "Carregar mais"}
              </button>
            </div>
          )}
        </div>
      )}

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Rejeitar Destino">
        <p style={{ fontSize: "14px", color: "var(--stone-600)", marginBottom: "16px" }}>
          Informe o motivo da rejeição.
        </p>
        <textarea
          rows={4}
          placeholder="Descreva o motivo..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          autoFocus
          style={{
            width: "100%",
            minHeight: "96px",
            padding: "8px 12px",
            border: "1px solid var(--stone-200)",
            borderRadius: "4px",
            fontSize: "16px",
            fontFamily: "var(--font-body)",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
        {rejectError && (
          <p role="alert" style={{ fontSize: "14px", color: "#DC2626", marginTop: "8px" }}>
            {rejectError}
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
          <button
            onClick={() => setRejectTarget(null)}
            style={{
              background: "white",
              color: "var(--stone-700)",
              border: "1px solid var(--stone-300)",
              padding: "8px 16px",
              borderRadius: "4px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleRejectSubmit}
            disabled={rejectSubmitting}
            style={{
              background: rejectSubmitting ? "var(--stone-400)" : "#DC2626",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: rejectSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {rejectSubmitting ? "Rejeitando..." : "Confirmar Rejeição"}
          </button>
        </div>
      </Modal>
    </>
  )
}
