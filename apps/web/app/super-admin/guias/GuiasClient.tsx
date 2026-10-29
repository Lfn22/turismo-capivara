"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { RejectReasonDialog } from "@/src/components/notifications/RejectReasonDialog"
import { AlreadyDecidedError, patchViaProxy, type RejectInput } from "@/lib/notification-actions"

type Status = "PENDING" | "APPROVED" | "REJECTED"

interface GuideRow {
  userId: string
  name: string
  email: string
  approvalStatus: Status
  rejectionReason: string | null
  credentialType: string | null
  credentialNumber: string | null
  credentialSubmittedAt: string | null
  hasDocument: boolean
  affiliation: { tenantName: string; status: string } | null
}

const TABS: { status: Status; label: string }[] = [
  { status: "PENDING", label: "Pendentes" },
  { status: "APPROVED", label: "Aprovados" },
  { status: "REJECTED", label: "Recusados" },
]

const AFFILIATION_LABEL: Record<string, string> = {
  PENDING: "aguardando confirmação",
  ACCEPTED: "confirmado",
  REJECTED: "recusado",
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
}

const btn = (bg: string): React.CSSProperties => ({
  background: bg,
  color: "white",
  padding: "6px 12px",
  borderRadius: "4px",
  fontSize: "13px",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  minHeight: "40px",
  whiteSpace: "nowrap",
})

export default function GuiasClient() {
  const [tab, setTab] = useState<Status>("PENDING")
  const [guides, setGuides] = useState<GuideRow[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<GuideRow | null>(null)

  const reqId = useRef(0)

  const load = useCallback(async (status: Status) => {
    const id = ++reqId.current
    try {
      const res = await fetch(`/api/proxy?path=${encodeURIComponent(`/platform/guides?status=${status}`)}`, {
        cache: "no-store",
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (id !== reqId.current) return
      setGuides(data.guides ?? [])
      setLoadError(false)
    } catch {
      if (id === reqId.current) setLoadError(true)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
    load(tab)
  }, [tab, load])

  // Executa a decisão; 409 vira aviso e a lista é recarregada de qualquer forma.
  async function decide(fn: () => Promise<void>) {
    setNotice(null)
    try {
      await fn()
    } catch (e) {
      if (e instanceof AlreadyDecidedError) {
        setNotice("Este pedido já foi decidido.")
      } else {
        throw e
      }
    }
    await load(tab)
  }

  async function approve(g: GuideRow) {
    setBusyId(g.userId)
    try {
      await decide(() => patchViaProxy(`/platform/guides/${g.userId}/approve`))
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Não foi possível concluir a ação.")
    } finally {
      setBusyId(null)
    }
  }

  async function reject(g: GuideRow, input: RejectInput) {
    await decide(() => patchViaProxy(`/platform/guides/${g.userId}/reject`, input))
    setRejecting(null)
  }

  return (
    <>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "24px", color: "var(--stone-900)", margin: "0 0 20px" }}>
        Verificação de guias
      </h1>
      <div role="tablist" style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {TABS.map((t) => (
          <button
            key={t.status}
            role="tab"
            aria-selected={tab === t.status}
            onClick={() => {
              setGuides(null)
              setTab(t.status)
            }}
            style={{
              padding: "8px 16px",
              borderRadius: "4px",
              border: "1px solid var(--stone-200)",
              background: tab === t.status ? "var(--ochre)" : "white",
              color: tab === t.status ? "white" : "var(--stone-700)",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {notice && (
        <p role="alert" style={{ fontSize: "14px", color: "#DC2626", background: "#FEF2F2", padding: "8px 12px", borderRadius: "4px" }}>
          {notice}
        </p>
      )}
      {loadError ? (
        <p style={{ color: "var(--stone-500)" }}>Erro ao carregar dados. Tente novamente.</p>
      ) : !guides ? (
        <p style={{ color: "var(--stone-500)" }}>Carregando…</p>
      ) : guides.length === 0 ? (
        <p style={{ color: "var(--stone-500)" }}>Nenhuma pendência</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "12px" }}>
          {guides.map((g) => (
            <li key={g.userId} style={{ background: "white", border: "1px solid var(--stone-200)", borderRadius: "8px", padding: "16px" }}>
              <p style={{ margin: 0, fontWeight: 700, color: "var(--stone-900)" }}>{g.name}</p>
              <p style={{ margin: "2px 0 8px", fontSize: "14px", color: "var(--stone-500)" }}>{g.email}</p>
              <p style={{ margin: "0 0 4px", fontSize: "14px", color: "var(--stone-700)" }}>
                {g.credentialType ?? "—"} · {g.credentialNumber ?? "—"}
                {g.credentialSubmittedAt ? ` · Enviado em ${fmtDate(g.credentialSubmittedAt)}` : ""}
              </p>
              <p style={{ margin: "0 0 8px", fontSize: "14px", color: "var(--stone-700)" }}>
                Vínculo declarado:{" "}
                {g.affiliation
                  ? `${g.affiliation.tenantName} (${AFFILIATION_LABEL[g.affiliation.status] ?? g.affiliation.status})`
                  : "nenhum"}
              </p>
              {g.rejectionReason && (
                <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#DC2626" }}>Motivo: {g.rejectionReason}</p>
              )}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {g.hasDocument && (
                  <a
                    href={`/api/platform/guides/${g.userId}/credential`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...btn("var(--stone-700)"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                  >
                    Ver comprovante
                  </a>
                )}
                {g.approvalStatus === "PENDING" && (
                  <>
                    <button disabled={busyId === g.userId} onClick={() => approve(g)} style={btn("var(--ochre)")}>
                      Aprovar
                    </button>
                    <button disabled={busyId === g.userId} onClick={() => setRejecting(g)} style={btn("#DC2626")}>
                      Recusar
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {rejecting && (
        <RejectReasonDialog
          kind="guide-codes"
          onCancel={() => setRejecting(null)}
          onSubmit={(input) => reject(rejecting, input)}
        />
      )}
    </>
  )
}
