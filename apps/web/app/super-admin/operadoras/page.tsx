"use client"
import { useState, useEffect } from "react"
import { Modal } from "@/components/ui/Modal"

interface Tenant {
  id: string
  name: string
  slug: string
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED"
  rejectionReason: string | null
  createdAt: string
  users: Array<{ email: string; name: string }>
}

const TENANT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  PENDING: { label: "Aguardando", bg: "#FEF9EC", color: "#B45309" },
  APPROVED: { label: "Aprovada", bg: "#F0FDF4", color: "#15803D" },
  REJECTED: { label: "Rejeitada", bg: "#FEF2F2", color: "#DC2626" },
}

// Shimmer animation style
const shimmerKeyframes = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`

export default function SuperAdminOperadorasPage() {
  const [items, setItems] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Tenant | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [rejectSubmitting, setRejectSubmitting] = useState(false)

  function loadTenants() {
    setLoading(true)
    setLoadError(false)
    setOffset(0)
    setHasMore(true)
    fetch("/api/super-admin/tenants/all?limit=50&offset=0")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.tenants ?? [])
        setItems(list)
        setHasMore(list.length === 20)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  function loadMore() {
    const nextOffset = offset + 20
    setLoadingMore(true)
    fetch(`/api/super-admin/tenants/all?limit=50&offset=${nextOffset}`)
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.tenants ?? [])
        setItems((prev) => [...prev, ...list])
        setOffset(nextOffset)
        setHasMore(list.length === 20)
      })
      .catch(() => { /* silencioso — botão permanece */ })
      .finally(() => setLoadingMore(false))
  }

  useEffect(() => {
    loadTenants()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleApprove(tenant: Tenant) {
    setActionLoading(tenant.id)
    setActionError(null)
    // Optimistic update — approvalStatus set to APPROVED immediately
    setItems((prev) =>
      prev.map((t) => (t.id === tenant.id ? { ...t, approvalStatus: "APPROVED" } : t))
    )
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenant.id}/approve`, {
        method: "PATCH",
      })
      if (!res.ok) throw new Error()
    } catch {
      // Rollback optimistic update
      setItems((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, approvalStatus: "PENDING" } : t))
      )
      setActionError("Não foi possível realizar a ação. Tente novamente.")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRejectSubmit() {
    if (!rejectTarget || !rejectReason.trim()) {
      setRejectError("Informe o motivo da rejeição.")
      return
    }
    setRejectSubmitting(true)
    setRejectError(null)
    try {
      const res = await fetch(`/api/super-admin/tenants/${rejectTarget.id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      })
      if (!res.ok) throw new Error()
      setItems((prev) =>
        prev.map((t) =>
          t.id === rejectTarget.id
            ? { ...t, approvalStatus: "REJECTED", rejectionReason: rejectReason }
            : t
        )
      )
      setRejectTarget(null)
      setRejectReason("")
    } catch {
      setRejectError("Não foi possível rejeitar a operadora. Tente novamente.")
    } finally {
      setRejectSubmitting(false)
    }
  }

  const pendingCount = items.filter((t) => t.approvalStatus === "PENDING").length

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
        Operadoras
      </h1>
      <p style={{ fontSize: "14px", color: "var(--stone-500)", marginBottom: "32px" }}>
        {pendingCount} operadoras aguardando aprovação
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
        // Shimmer skeleton
        <div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "52px",
                marginBottom: "8px",
                borderRadius: "4px",
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
          Erro ao carregar operadoras.{" "}
          <button
            onClick={loadTenants}
            style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", textDecoration: "underline", fontSize: "14px" }}
          >
            Tentar novamente
          </button>
        </div>
      ) : items.length === 0 ? (
        <p
          style={{
            textAlign: "center",
            padding: "48px 24px",
            fontSize: "16px",
            color: "var(--stone-500)",
          }}
        >
          Nenhuma operadora cadastrada ainda.
        </p>
      ) : (
        <div>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr style={{ background: "var(--stone-100)" }}>
                {["Nome", "Slug", "Email", "Cadastro", "Status", "Ações"].map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontWeight: 600,
                      color: "var(--stone-700)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const status = TENANT_STATUS[item.approvalStatus] ?? TENANT_STATUS.PENDING
                return (
                  <tr
                    key={item.id}
                    style={{
                      background: index % 2 === 0 ? "white" : "var(--stone-50)",
                      borderBottom: "1px solid var(--stone-100)",
                    }}
                  >
                    <td style={{ padding: "12px 16px", color: "var(--stone-800)" }}>{item.name}</td>
                    <td style={{ padding: "12px 16px", color: "var(--stone-600)", fontFamily: "monospace" }}>{item.slug}</td>
                    <td style={{ padding: "12px 16px", color: "var(--stone-600)" }}>
                      {item.users[0]?.email ?? "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--stone-600)", whiteSpace: "nowrap" }}>
                      {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 600,
                          background: status.bg,
                          color: status.color,
                        }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {item.approvalStatus === "PENDING" ? (
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            onClick={() => handleApprove(item)}
                            disabled={actionLoading === item.id}
                            aria-label={`Aprovar operadora ${item.name}`}
                            style={{
                              background: "var(--ochre)",
                              color: "white",
                              border: "none",
                              padding: "8px 12px",
                              borderRadius: "4px",
                              fontSize: "14px",
                              fontWeight: 600,
                              cursor: actionLoading === item.id ? "not-allowed" : "pointer",
                              minHeight: "40px",
                              opacity: actionLoading === item.id ? 0.6 : 1,
                            }}
                          >
                            Aprovar Operadora
                          </button>
                          <button
                            onClick={() => {
                              setRejectTarget(item)
                              setRejectReason("")
                              setRejectError(null)
                            }}
                            disabled={actionLoading === item.id}
                            aria-label={`Rejeitar operadora ${item.name}`}
                            style={{
                              background: "#DC2626",
                              color: "white",
                              border: "none",
                              padding: "8px 12px",
                              borderRadius: "4px",
                              fontSize: "14px",
                              fontWeight: 600,
                              cursor: actionLoading === item.id ? "not-allowed" : "pointer",
                              minHeight: "40px",
                              opacity: actionLoading === item.id ? 0.6 : 1,
                            }}
                          >
                            Rejeitar Operadora
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "var(--stone-400)" }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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

      {/* Rejection Modal */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Rejeitar Operadora"
      >
        <p style={{ fontSize: "14px", color: "var(--stone-600)", marginBottom: "16px" }}>
          Informe o motivo da rejeição. A operadora receberá este motivo por email.
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
            Fechar Modal
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
