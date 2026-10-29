"use client"
import { use, useCallback, useEffect, useState } from "react"
import { RejectReasonDialog } from "@/src/components/notifications/RejectReasonDialog"
import { AlreadyDecidedError, patchViaProxy, type RejectInput } from "@/lib/notification-actions"

function CopyLinkBanner() {
  const [copied, setCopied] = useState(false)
  const link = typeof window !== "undefined"
    ? `${window.location.origin}/cadastro/guia`
    : "/cadastro/guia"

  function handleCopy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      style={{
        background: "#FFFBEB",
        border: "1px solid #FDE68A",
        borderRadius: "8px",
        padding: "16px 20px",
        marginBottom: "24px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#92400E", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Link de cadastro para guias
        </p>
        <p style={{ fontSize: "13px", color: "#78350F", margin: 0, wordBreak: "break-all" }}>
          {link}
        </p>
      </div>
      <button
        onClick={handleCopy}
        style={{
          padding: "8px 16px",
          background: copied ? "#15803D" : "var(--ochre)",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          minHeight: "36px",
        }}
      >
        {copied ? "Copiado!" : "Copiar link"}
      </button>
    </div>
  )
}

interface Affiliation {
  id: string
  status: string
  createdAt: string
  guide: { userId: string; name: string; email: string; approvalStatus: string }
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

export default function AdminGuiasPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const [items, setItems] = useState<Affiliation[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<Affiliation | null>(null)

  const load = useCallback(async () => {
    try {
      const path = `/tenants/${slug}/admin/affiliations?status=PENDING`
      const res = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, { cache: "no-store" })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setItems(data.affiliations ?? [])
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [slug])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
    load()
  }, [load])

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
    await load()
  }

  async function accept(a: Affiliation) {
    setBusyId(a.id)
    try {
      await decide(() => patchViaProxy(`/affiliations/${a.id}/accept`))
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Não foi possível concluir a ação.")
    } finally {
      setBusyId(null)
    }
  }

  async function reject(a: Affiliation, input: RejectInput) {
    await decide(() => patchViaProxy(`/affiliations/${a.id}/reject`, input))
    setRejecting(null)
  }

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
          Pedidos de vínculo
        </h1>
        <p style={{ fontSize: "14px", color: "var(--stone-500)", margin: "8px 0 0" }}>
          Guias que declararam atuar com sua agência
        </p>
      </div>

      <CopyLinkBanner />

      {notice && (
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
          {notice}
        </p>
      )}

      {loadError ? (
        <p style={{ color: "var(--stone-500)" }}>Erro ao carregar dados. Tente novamente.</p>
      ) : !items ? (
        <p style={{ color: "var(--stone-500)" }}>Carregando…</p>
      ) : items.length === 0 ? (
        <p style={{ color: "var(--stone-500)" }}>Nenhuma pendência</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "12px" }}>
          {items.map((a) => (
            <li
              key={a.id}
              style={{
                background: "white",
                border: "1px solid var(--stone-200)",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <p style={{ margin: 0, fontWeight: 700, color: "var(--stone-900)" }}>{a.guide.name}</p>
              <p style={{ margin: "2px 0 4px", fontSize: "14px", color: "var(--stone-500)" }}>{a.guide.email}</p>
              <p style={{ margin: "0 0 12px", fontSize: "12px", color: "var(--stone-500)" }}>
                Pedido em {new Date(a.createdAt).toLocaleDateString("pt-BR")}
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button disabled={busyId === a.id} onClick={() => accept(a)} style={btn("var(--ochre)")}>
                  Confirmar vínculo
                </button>
                <button disabled={busyId === a.id} onClick={() => setRejecting(a)} style={btn("#DC2626")}>
                  Recusar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {rejecting && (
        <RejectReasonDialog
          kind="free-text"
          onCancel={() => setRejecting(null)}
          onSubmit={(input) => reject(rejecting, input)}
        />
      )}
    </>
  )
}
