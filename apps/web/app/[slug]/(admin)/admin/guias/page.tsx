"use client"
import { use, useState, useEffect } from "react"
import { Modal } from "@/components/ui/Modal"

interface GuideUser {
  id: string
  name: string
  email: string
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED"
  rejectionReason: string | null
}

interface Guide {
  id: string
  bio: string | null
  especialidades: string[]
  regioes: string[]
  user: GuideUser
}


const GUIDE_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  PENDING: { label: "Aguardando", bg: "#FEF9EC", color: "#B45309" },
  APPROVED: { label: "Aprovado", bg: "#F0FDF4", color: "#15803D" },
  REJECTED: { label: "Rejeitado", bg: "#FEF2F2", color: "#DC2626" },
}

export default function AdminGuiasPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Rejection modal state
  const [rejectGuide, setRejectGuide] = useState<Guide | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [rejectSubmitting, setRejectSubmitting] = useState(false)

  function loadGuides() {
    setLoading(true)
    setLoadError(false)
    fetch(`/api/proxy?path=/tenants/${slug}/admin/guides`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) =>
        setGuides(Array.isArray(data) ? data : data.guides ?? [])
      )
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadGuides()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  async function handleApprove(guide: Guide) {
    setActionLoading(guide.id)
    setActionError(null)
    // Optimistic update
    setGuides((prev) =>
      prev.map((g) =>
        g.id === guide.id
          ? { ...g, user: { ...g.user, approvalStatus: "APPROVED" } }
          : g
      )
    )
    try {
      const res = await fetch(
        `/api/proxy?path=/tenants/${slug}/admin/guides/${guide.id}/approve`,
        { method: "PATCH" }
      )
      if (!res.ok) throw new Error()
    } catch {
      // Revert on failure
      setGuides((prev) =>
        prev.map((g) =>
          g.id === guide.id
            ? { ...g, user: { ...g.user, approvalStatus: "PENDING" } }
            : g
        )
      )
      setActionError("Nao foi possivel realizar a acao. Tente novamente.")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRejectConfirm() {
    if (!rejectGuide) return
    if (!rejectReason.trim()) {
      setRejectError("Informe o motivo da rejeicao.")
      return
    }
    setRejectSubmitting(true)
    setRejectError(null)

    try {
      const res = await fetch(
        `/api/proxy?path=/tenants/${slug}/admin/guides/${rejectGuide.id}/reject`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rejectReason }),
        }
      )
      if (!res.ok) throw new Error()

      // Update local state
      const reason = rejectReason
      const id = rejectGuide.id
      setGuides((prev) =>
        prev.map((g) =>
          g.id === id
            ? {
                ...g,
                user: {
                  ...g.user,
                  approvalStatus: "REJECTED",
                  rejectionReason: reason,
                },
              }
            : g
        )
      )
      setRejectGuide(null)
      setRejectReason("")
    } catch {
      setRejectError("Nao foi possivel rejeitar o guia. Tente novamente.")
    } finally {
      setRejectSubmitting(false)
    }
  }

  const pending = guides.filter(
    (g) => g.user.approvalStatus === "PENDING"
  )
  const others = guides.filter(
    (g) => g.user.approvalStatus !== "PENDING"
  )

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <p
          style={{
            fontSize: "11px",
            color: "var(--ochre)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          Admin
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "24px",
            color: "var(--stone-900)",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          Aprovacao de Guias
        </h1>
      </div>

      {actionError && (
        <p
          role="alert"
          style={{
            fontSize: "14px",
            color: "#DC2626",
            marginBottom: "16px",
            padding: "8px 12px",
            background: "#FEF2F2",
            borderRadius: "4px",
          }}
        >
          {actionError}
        </p>
      )}

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
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                style={{
                  height: "52px",
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
        ) : loadError ? (
          <p
            style={{
              textAlign: "center",
              padding: "48px 24px",
              fontSize: "16px",
              color: "var(--stone-500)",
              margin: 0,
            }}
          >
            Erro ao carregar dados. Tente novamente.
          </p>
        ) : guides.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              padding: "48px 24px",
              fontSize: "16px",
              color: "var(--stone-500)",
              margin: 0,
            }}
          >
            Nenhum guia cadastrado ainda.
          </p>
        ) : (
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}
          >
            <thead>
              <tr style={{ background: "var(--stone-100)" }}>
                {["Nome", "Email", "Especialidades", "Status", "Acoes"].map(
                  (h) => (
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
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {[...pending, ...others].map((guide, i) => {
                const st =
                  GUIDE_STATUS[guide.user.approvalStatus] ??
                  GUIDE_STATUS.PENDING
                const isActing = actionLoading === guide.id
                return (
                  <tr
                    key={guide.id}
                    style={{
                      background: i % 2 === 0 ? "white" : "var(--stone-50)",
                      borderBottom: "1px solid var(--stone-200)",
                    }}
                  >
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                      {guide.user.name}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {guide.user.email}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "var(--stone-500)",
                        fontSize: "13px",
                      }}
                    >
                      {guide.especialidades?.slice(0, 3).join(", ") || "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: st.bg,
                          color: st.color,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {guide.user.approvalStatus === "PENDING" && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => handleApprove(guide)}
                            disabled={isActing}
                            aria-label={`Aprovar guia ${guide.user.name}`}
                            style={{
                              background: "var(--ochre)",
                              color: "white",
                              padding: "6px 12px",
                              borderRadius: "4px",
                              fontSize: "13px",
                              fontWeight: 600,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                              border: "none",
                              cursor: isActing ? "not-allowed" : "pointer",
                              opacity: isActing ? 0.7 : 1,
                              minHeight: "40px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isActing ? "..." : "Aprovar Guia"}
                          </button>
                          <button
                            onClick={() => {
                              setRejectGuide(guide)
                              setRejectReason("")
                              setRejectError(null)
                            }}
                            disabled={isActing}
                            aria-label={`Rejeitar guia ${guide.user.name}`}
                            style={{
                              background: "#DC2626",
                              color: "white",
                              padding: "6px 12px",
                              borderRadius: "4px",
                              fontSize: "13px",
                              fontWeight: 600,
                              border: "none",
                              cursor: isActing ? "not-allowed" : "pointer",
                              opacity: isActing ? 0.7 : 1,
                              minHeight: "40px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Rejeitar Guia
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Rejection Modal */}
      <Modal
        open={!!rejectGuide}
        onClose={() => {
          setRejectGuide(null)
          setRejectReason("")
          setRejectError(null)
        }}
        title="Rejeitar Guia"
        titleId="reject-modal-title"
      >
        <p
          style={{
            fontSize: "16px",
            color: "var(--stone-700)",
            marginBottom: "16px",
          }}
        >
          Informe o motivo da rejeicao. O guia podera ver esta mensagem.
        </p>

        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="reject-reason"
            style={{
              display: "block",
              fontSize: "14px",
              color: "var(--stone-700)",
              marginBottom: "4px",
              fontWeight: 600,
            }}
          >
            Motivo
          </label>
          <textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            placeholder="Descreva o motivo..."
            autoFocus
            aria-describedby={rejectError ? "reject-error" : undefined}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: `1px solid ${rejectError ? "#DC2626" : "var(--stone-300)"}`,
              borderRadius: "4px",
              fontSize: "16px",
              color: "var(--stone-800)",
              background: "white",
              resize: "vertical",
              minHeight: "96px",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          {rejectError && (
            <p
              id="reject-error"
              style={{ fontSize: "14px", color: "#DC2626", marginTop: "4px" }}
            >
              {rejectError}
            </p>
          )}
        </div>

        <div
          style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}
        >
          <button
            type="button"
            onClick={() => {
              setRejectGuide(null)
              setRejectReason("")
              setRejectError(null)
            }}
            style={{
              padding: "8px 20px",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 600,
              background: "transparent",
              color: "var(--stone-700)",
              border: "1px solid var(--stone-300)",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleRejectConfirm}
            disabled={rejectSubmitting}
            style={{
              background: rejectSubmitting ? "var(--stone-400)" : "#DC2626",
              color: "white",
              padding: "8px 20px",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              cursor: rejectSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {rejectSubmitting ? "Rejeitando..." : "Confirmar Rejeição"}
          </button>
        </div>
      </Modal>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  )
}
