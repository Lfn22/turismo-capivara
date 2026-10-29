"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { compressImage } from "@/lib/compress-image"

type CredentialType = "ICMBIO" | "CADASTUR"
type Affiliation = {
  id: string
  tenantName: string
  tenantType: string
  status: "PENDING" | "ACCEPTED" | "REJECTED"
  rejectionReason: string | null
}
type Me = {
  approvalStatus: string
  rejectionReason: string | null
  credentialType: CredentialType | null
  credentialNumber: string | null
  credentialSubmittedAt: string | null
  tenantSlug: string
  affiliation: Affiliation | null
}

const MAX_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
const NETWORK_ERROR = "Não foi possível enviar. Verifique sua conexão."

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid var(--stone-200)",
  borderRadius: "8px",
  padding: "clamp(32px, 5vw, 48px) clamp(24px, 5vw, 40px)",
  width: "100%",
  maxWidth: "480px",
}
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--stone-300)",
  borderRadius: "4px",
  fontSize: "16px",
  color: "var(--stone-800)",
  background: "white",
  boxSizing: "border-box",
}
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--stone-700)",
  marginBottom: "6px",
}
const titleStyle: React.CSSProperties = {
  fontFamily: "var(--font-display, Georgia, serif)",
  fontSize: "24px",
  fontWeight: 400,
  color: "var(--stone-900)",
  margin: "0 0 12px",
}
const linkButton: React.CSSProperties = {
  display: "inline-block",
  background: "var(--stone-900)",
  color: "white",
  padding: "12px 20px",
  borderRadius: "4px",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  minHeight: "48px",
  boxSizing: "border-box",
}

function formatDayMonth(iso: string | null): string | null {
  if (!iso) return null
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso))
}

function validateFile(f: File): string | null {
  if (!ALLOWED_TYPES.includes(f.type)) return "Envie o comprovante em JPEG, PNG, WebP ou PDF"
  if (!f.type.startsWith("image/") && f.size > MAX_FILE_BYTES) return "O comprovante deve ter até 10 MB"
  return null
}

function affiliationText(a: Affiliation): string {
  if (a.status === "ACCEPTED") return `${a.tenantName}: vínculo confirmado`
  if (a.status === "REJECTED") return `${a.tenantName}: vínculo recusado: ${a.rejectionReason ?? ""}`
  return `${a.tenantName}: vínculo não confirmado`
}

export default function GuiaStatus() {
  const { data: session, status: sessionStatus } = useSession()
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [credentialType, setCredentialType] = useState<CredentialType>("CADASTUR")
  const [credentialNumber, setCredentialNumber] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [networkFailed, setNetworkFailed] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch("/api/proxy?path=/guides/me")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: Me) => {
        setMe(data)
        if (data.credentialType) setCredentialType(data.credentialType)
        setCredentialNumber(data.credentialNumber ?? "")
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  async function handleResubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNetworkFailed(false)
    if (!file) {
      setError("Envie o comprovante em JPEG, PNG, WebP ou PDF")
      return
    }
    const fileError = validateFile(file)
    if (fileError) {
      setError(fileError)
      return
    }

    setSending(true)
    try {
      const toSend = await compressImage(file)
      if (toSend.size > MAX_FILE_BYTES) {
        setError("O comprovante deve ter até 10 MB")
        return
      }
      const form = new FormData()
      form.append("credentialType", credentialType)
      if (credentialNumber.trim()) form.append("credentialNumber", credentialNumber.trim())
      form.append("file", toSend, toSend.name)

      let res: Response
      try {
        res = await fetch("/api/guides/me/credential", { method: "POST", body: form })
      } catch {
        setNetworkFailed(true)
        setError(NETWORK_ERROR)
        return
      }
      if (res.ok) {
        setMe((prev) =>
          prev
            ? {
                ...prev,
                approvalStatus: "PENDING",
                rejectionReason: null,
                credentialType,
                credentialNumber: credentialNumber.trim() || null,
                credentialSubmittedAt: new Date().toISOString(),
              }
            : prev,
        )
        setFile(null)
        return
      }
      const data = await res.json().catch(() => ({}))
      if (data.errors?.length) setError(data.errors[0].message)
      else setError(data.message ?? "Erro ao reenviar. Tente novamente.")
    } finally {
      setSending(false)
    }
  }

  const since = formatDayMonth(me?.credentialSubmittedAt ?? null)
  // Vínculo confirmado, mas o token ainda aponta para a agência antiga: painel só após novo login
  const sessionStale = me?.affiliation?.status === "ACCEPTED" && me.tenantSlug !== session?.user?.tenantSlug
  const needsRelogin = sessionStale && sessionStatus === "authenticated"

  return (
    <main style={{ minHeight: "100dvh", background: "var(--stone-50)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={cardStyle}>
        <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ochre)", margin: "0 0 8px" }}>
          Cadastro de Guia
        </p>

        {loading && <p style={{ color: "var(--stone-500)" }}>Carregando…</p>}
        {loadError && <p role="alert" style={{ color: "#DC2626" }}>Erro ao carregar dados. Tente novamente.</p>}

        {me && needsRelogin && (
          <>
            <h1 style={titleStyle}>Vínculo confirmado</h1>
            <p style={{ fontSize: "15px", color: "var(--stone-600)", lineHeight: 1.6, margin: "0 0 20px" }}>
              Seu vínculo foi confirmado. Saia e entre de novo para acessar o painel da agência.
            </p>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{ ...linkButton, border: "none", cursor: "pointer" }}
            >
              Sair e entrar de novo
            </button>
          </>
        )}

        {me && !sessionStale && me.approvalStatus === "APPROVED" && (
          <>
            <h1 style={titleStyle}>Você é um guia verificado ✓</h1>
            <Link href={`/${me.tenantSlug}/painel/dashboard`} style={linkButton}>Ir para o painel</Link>
          </>
        )}

        {me && !sessionStale && me.approvalStatus !== "APPROVED" && me.approvalStatus !== "REJECTED" && (
          <>
            <h1 style={titleStyle}>Em análise{since ? ` desde ${since}` : ""}</h1>
            <p style={{ fontSize: "15px", color: "var(--stone-600)", lineHeight: 1.6, margin: "0 0 20px" }}>
              Enquanto isso, complete seu perfil para aparecer no site assim que for aprovado.
            </p>
            <Link href={`/${me.tenantSlug}/painel/perfil`} style={linkButton}>Completar perfil</Link>
          </>
        )}

        {me && me.approvalStatus === "REJECTED" && (
          <>
            <p role="alert" style={{ fontSize: "15px", color: "#DC2626", lineHeight: 1.6, margin: "0 0 20px" }}>
              Seu comprovante não foi aceito: {me.rejectionReason}
            </p>
            <form onSubmit={handleResubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label htmlFor="credentialType" style={labelStyle}>Comprovante de atuação</label>
                <select id="credentialType" value={credentialType} onChange={(e) => setCredentialType(e.target.value as CredentialType)} style={inputStyle}>
                  <option value="CADASTUR">Cadastur</option>
                  <option value="ICMBIO">ICMBio</option>
                </select>
              </div>
              <div>
                <label htmlFor="credentialNumber" style={labelStyle}>Número (se houver)</label>
                <input id="credentialNumber" type="text" value={credentialNumber} onChange={(e) => setCredentialNumber(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label htmlFor="file" style={labelStyle}>Novo arquivo do comprovante</label>
                <input
                  id="file"
                  type="file"
                  accept="image/*,application/pdf"
                  required
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    setFile(f)
                    setError(f ? validateFile(f) : null)
                  }}
                  style={{ ...inputStyle, padding: "8px" }}
                />
                <p style={{ fontSize: "13px", color: "var(--stone-400)", marginTop: "4px" }}>JPEG, PNG, WebP ou PDF, até 10 MB</p>
              </div>
              {error && (
                <p role="alert" style={{ fontSize: "14px", color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "4px", padding: "10px 12px", margin: 0 }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={sending}
                style={{ background: sending ? "var(--stone-400)" : "var(--stone-900)", color: "white", padding: "12px 16px", borderRadius: "4px", fontSize: "15px", fontWeight: 600, border: "none", cursor: sending ? "not-allowed" : "pointer", minHeight: "48px", width: "100%" }}
              >
                {sending ? "Enviando..." : networkFailed ? "Tentar de novo" : "Reenviar comprovante"}
              </button>
            </form>
          </>
        )}

        {me?.affiliation && (
          <p style={{ fontSize: "14px", color: "var(--stone-600)", margin: "24px 0 0", paddingTop: "16px", borderTop: "1px solid var(--stone-200)" }}>
            {affiliationText(me.affiliation)}
          </p>
        )}
      </div>
    </main>
  )
}
