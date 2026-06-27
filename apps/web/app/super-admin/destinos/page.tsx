"use client"
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"

interface Destination {
  id: string
  title: string
  state: string
  heroImageUrl: string | null
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED"
  createdBy: { name: string; email: string; tenant: { slug: string; name: string } } | null
  createdAt: string
}

const shimmerKeyframes = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`

export default function SuperAdminDestinosPendentesPage() {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadDestinations = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    fetch("/api/admin/destinations/pending?limit=50&offset=0")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        // API may return { destinations: [...] } or plain array
        setDestinations(Array.isArray(data) ? data : (data.destinations ?? []))
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadDestinations()
  }, [loadDestinations])

  async function handleApprove(dest: Destination) {
    setActionLoading(dest.id)
    setActionError(null)
    // Optimistic: remove from PENDING list immediately
    setDestinations((prev) => prev.filter((d) => d.id !== dest.id))
    try {
      const res = await fetch(`/api/admin/destinations/${dest.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: "APPROVED" }),
      })
      if (!res.ok) throw new Error()
      toast.success("Destino aprovado com sucesso.")
    } catch {
      // Rollback: reload server state
      setDestinations((prev) => [dest, ...prev])
      setActionError("Não foi possível aprovar o destino. Tente novamente.")
      toast.error("Erro ao processar ação. Tente novamente.")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(dest: Destination) {
    setActionLoading(dest.id)
    setActionError(null)
    // Optimistic: remove from PENDING list immediately
    setDestinations((prev) => prev.filter((d) => d.id !== dest.id))
    try {
      const res = await fetch(`/api/admin/destinations/${dest.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: "REJECTED" }),
      })
      if (!res.ok) throw new Error()
      toast.success("Destino rejeitado.")
    } catch {
      // Rollback: re-add to list
      setDestinations((prev) => [dest, ...prev])
      setActionError("Não foi possível rejeitar o destino. Tente novamente.")
      toast.error("Erro ao processar ação. Tente novamente.")
    } finally {
      setActionLoading(null)
    }
  }

  const pendingCount = destinations.length

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
          marginBottom: "4px",
        }}
      >
        Destinos Pendentes
      </h1>
      <p style={{ fontSize: "14px", color: "var(--stone-500)", marginBottom: "32px" }}>
        {loading ? "Carregando..." : `${pendingCount} destino${pendingCount !== 1 ? "s" : ""} aguardando aprovação`}
      </p>

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
                background:
                  "linear-gradient(90deg, var(--stone-100), var(--stone-50), var(--stone-100))",
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
          Nenhum destino pendente. Todos os destinos foram revisados.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {destinations.map((dest) => {
            const busy = actionLoading === dest.id
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
                {/* Thumbnail */}
                {dest.heroImageUrl ? (
                  <img
                    src={dest.heroImageUrl}
                    alt={dest.title}
                    style={{
                      width: "60px",
                      height: "60px",
                      objectFit: "cover",
                      borderRadius: "4px",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    aria-hidden
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "4px",
                      background: "var(--stone-100)",
                      flexShrink: 0,
                    }}
                  />
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: "160px" }}>
                  <p
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--stone-900)",
                      margin: 0,
                    }}
                  >
                    {dest.title}
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--stone-500)",
                      margin: "2px 0 0",
                    }}
                  >
                    {dest.createdBy?.tenant?.slug ?? "—"} &middot; {dest.state}
                  </p>
                </div>

                {/* Status badge */}
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: "#FEF9EC",
                    color: "#B45309",
                    whiteSpace: "nowrap",
                  }}
                >
                  PENDENTE
                </span>

                {/* Action buttons */}
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
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
