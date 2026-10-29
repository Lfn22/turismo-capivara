"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { compressImage } from "@/lib/compress-image"

type Kind = "AUTONOMO" | "ASSOCIACAO" | "AGENCIA"
type CredentialType = "ICMBIO" | "CADASTUR"
type TenantOption = { id: string; name: string; slug: string; type: "AGENCIA" | "ASSOCIACAO" }

const MAX_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
const NETWORK_ERROR = "Não foi possível enviar. Verifique sua conexão."

const KIND_OPTIONS: { kind: Kind; title: string; text: string }[] = [
  { kind: "AUTONOMO", title: "Autônomo", text: "Atuo por conta própria" },
  { kind: "ASSOCIACAO", title: "Associação", text: "Faço parte de uma associação de guias" },
  { kind: "AGENCIA", title: "Agência", text: "Trabalho para uma agência" },
]

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

const hintStyle: React.CSSProperties = { fontSize: "13px", color: "var(--stone-400)", marginTop: "4px" }

const backStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--stone-500)",
  padding: 0,
  marginBottom: "24px",
  display: "block",
}

function primaryButton(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? "var(--stone-400)" : "var(--stone-900)",
    color: "white",
    padding: "12px 16px",
    borderRadius: "4px",
    fontSize: "15px",
    fontWeight: 600,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    minHeight: "48px",
    width: "100%",
  }
}

export default function CadastroGuiaPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [kind, setKind] = useState<Kind | null>(null)

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<TenantOption[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [tenant, setTenant] = useState<TenantOption | null>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [cpf, setCpf] = useState("")
  const [password, setPassword] = useState("")
  const [credentialType, setCredentialType] = useState<CredentialType>("CADASTUR")
  const [credentialNumber, setCredentialNumber] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [networkFailed, setNetworkFailed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  const previewUrl = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file],
  )
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const needsTenant = kind === "ASSOCIACAO" || kind === "AGENCIA"
  const trimmedQuery = query.trim()

  useEffect(() => {
    if (step !== 2 || !kind || trimmedQuery.length < 2) return
    let cancelled = false
    const timer = setTimeout(async () => {
      setSearching(true)
      setSearchError(null)
      try {
        const res = await fetch(`/api/tenants/search?q=${encodeURIComponent(trimmedQuery)}`)
        if (!res.ok) throw new Error("search failed")
        const data = await res.json()
        if (cancelled) return
        const list: TenantOption[] = (data.tenants ?? []).filter((t: TenantOption) => t.type === kind)
        setResults(list.slice(0, 10))
      } catch {
        if (!cancelled) {
          setResults([])
          setSearchError("Não foi possível buscar agora. Tente de novo.")
        }
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmedQuery, step, kind])

  function chooseKind(k: Kind) {
    setKind(k)
    setTenant(null)
    setQuery("")
    setResults([])
    setSearchError(null)
    setStep(k === "AUTONOMO" ? 3 : 2)
  }

  function validateFile(f: File): string | null {
    if (!ALLOWED_TYPES.includes(f.type)) return "Envie o comprovante em JPEG, PNG, WebP ou PDF"
    if (!f.type.startsWith("image/") && f.size > MAX_FILE_BYTES) return "O comprovante deve ter até 10 MB"
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNetworkFailed(false)

    const cpfDigits = cpf.replace(/\D/g, "")
    if (cpfDigits.length !== 11) {
      setError("CPF deve conter 11 dígitos numéricos.")
      return
    }
    if (!file) {
      setError("Envie o comprovante em JPEG, PNG, WebP ou PDF")
      return
    }
    const fileError = validateFile(file)
    if (fileError) {
      setError(fileError)
      return
    }

    setLoading(true)
    try {
      const toSend = await compressImage(file)
      if (toSend.size > MAX_FILE_BYTES) {
        setError("O comprovante deve ter até 10 MB")
        return
      }
      const form = new FormData()
      form.append("name", name.trim())
      form.append("email", email.trim())
      form.append("password", password)
      form.append("cpf", cpfDigits)
      form.append("kind", kind ?? "AUTONOMO")
      if (needsTenant && tenant) form.append("tenantId", tenant.id)
      form.append("credentialType", credentialType)
      if (credentialNumber.trim()) form.append("credentialNumber", credentialNumber.trim())
      form.append("file", toSend, toSend.name)

      let res: Response
      try {
        res = await fetch("/api/auth/register-guide", { method: "POST", body: form })
      } catch {
        setNetworkFailed(true)
        setError(NETWORK_ERROR)
        return
      }

      if (res.status === 201) {
        const login = await signIn("credentials", { email: email.trim(), password, redirect: false }).catch(() => null)
        if (!login?.ok) {
          setRegistered(true)
          return
        }
        router.push("/guia/status")
        return
      }
      const data = await res.json().catch(() => ({}))
      if (data.errors?.length) setError(data.errors[0].message)
      else setError(data.message ?? "Erro ao criar conta. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const stepTitle =
    step === 1 ? "Como você trabalha?" : step === 2 ? (kind === "AGENCIA" ? "Qual agência?" : "Qual associação?") : "Seus dados e comprovante"

  if (registered) {
    return (
      <main style={{ minHeight: "100dvh", background: "var(--stone-50)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 400, color: "var(--stone-900)", margin: "0 0 12px" }}>
            Cadastro enviado!
          </h1>
          <p style={{ fontSize: "15px", color: "var(--stone-600)", margin: "0 0 24px", lineHeight: 1.6 }}>
            Entre com seu e-mail e senha para acompanhar a verificação.
          </p>
          <Link href="/login" style={{ color: "var(--ochre)", fontWeight: 600, textDecoration: "none" }}>
            Entrar
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: "100dvh", background: "var(--stone-50)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <Link href="/" style={{ display: "inline-block", marginBottom: "16px" }}>
            <Image src="/images/logo.png" alt="CAPI" width={64} height={58} style={{ display: "block" }} />
          </Link>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ochre)", margin: "0 0 8px" }}>
            Cadastro de Guia
          </p>
          <h1 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 400, color: "var(--stone-900)", margin: 0 }}>
            {stepTitle}
          </h1>
        </div>

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {KIND_OPTIONS.map((o) => (
              <button
                key={o.kind}
                type="button"
                onClick={() => chooseKind(o.kind)}
                style={{ width: "100%", padding: "16px 20px", background: "white", border: "1px solid var(--stone-200)", borderRadius: "8px", cursor: "pointer", textAlign: "left", minHeight: "48px" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--ochre)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--stone-200)")}
              >
                <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--stone-900)", margin: "0 0 4px" }}>{o.title}</p>
                <p style={{ fontSize: "13px", color: "var(--stone-500)", margin: 0 }}>{o.text}</p>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div>
            <button type="button" onClick={() => setStep(1)} style={backStyle}>← Voltar</button>
            <label htmlFor="tenant-search" style={labelStyle}>
              Buscar {kind === "AGENCIA" ? "agência" : "associação"} pelo nome
            </label>
            <input
              id="tenant-search"
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setTenant(null)
                if (e.target.value.trim().length < 2) {
                  setResults([])
                  setSearching(false)
                }
              }}
              placeholder="Digite ao menos 2 letras"
              style={inputStyle}
              autoComplete="off"
            />
            <div aria-live="polite" style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {searching && trimmedQuery.length >= 2 && <p style={{ fontSize: "14px", color: "var(--stone-500)", margin: 0 }}>Buscando…</p>}
              {searchError && <p role="alert" style={{ fontSize: "14px", color: "#DC2626", margin: 0 }}>{searchError}</p>}
              {!searching && !searchError && trimmedQuery.length >= 2 && results.length === 0 && (
                <p style={{ fontSize: "14px", color: "var(--stone-500)", margin: 0 }}>Nenhum resultado.</p>
              )}
              {trimmedQuery.length >= 2 &&
                results.map((t) => {
                  const selected = tenant?.id === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTenant(t)}
                      style={{ padding: "12px", textAlign: "left", background: selected ? "var(--stone-50)" : "white", border: `1px solid ${selected ? "var(--ochre)" : "var(--stone-200)"}`, borderRadius: "4px", cursor: "pointer", fontSize: "15px", color: "var(--stone-900)", minHeight: "44px" }}
                    >
                      {t.name}
                    </button>
                  )
                })}
            </div>
            <p style={{ ...hintStyle, marginTop: "16px" }}>
              Não encontrou? Cadastre-se como autônomo e peça o vínculo depois.
            </p>
            <button
              type="button"
              disabled={!tenant}
              onClick={() => setStep(3)}
              style={{ ...primaryButton(!tenant), marginTop: "20px" }}
            >
              Continuar
            </button>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <button type="button" onClick={() => setStep(needsTenant ? 2 : 1)} style={{ ...backStyle, marginBottom: 0 }}>← Voltar</button>
            {tenant && (
              <p style={{ fontSize: "14px", color: "var(--stone-600)", margin: 0 }}>
                Vínculo declarado: <strong>{tenant.name}</strong>
              </p>
            )}

            <div>
              <label htmlFor="name" style={labelStyle}>Nome completo</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} autoComplete="name" />
            </div>
            <div>
              <label htmlFor="email" style={labelStyle}>E-mail</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} autoComplete="email" />
            </div>
            <div>
              <label htmlFor="cpf" style={labelStyle}>CPF</label>
              <input
                id="cpf"
                type="text"
                inputMode="numeric"
                value={cpf}
                onChange={(e) => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="Somente números"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="password" style={labelStyle}>Senha</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={inputStyle} autoComplete="new-password" />
              <p style={hintStyle}>Mínimo 8 caracteres</p>
            </div>

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
              <label htmlFor="file" style={labelStyle}>Foto ou arquivo do comprovante</label>
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
              <p style={hintStyle}>JPEG, PNG, WebP ou PDF, até 10 MB</p>
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Pré-visualização do comprovante" style={{ marginTop: "8px", maxWidth: "100%", maxHeight: "240px", borderRadius: "4px", border: "1px solid var(--stone-200)" }} />
              )}
              {file && !previewUrl && <p style={hintStyle}>{file.name}</p>}
            </div>

            {error && (
              <p role="alert" style={{ fontSize: "14px", color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "4px", padding: "10px 12px", margin: 0 }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} style={primaryButton(loading)}>
              {loading ? "Enviando..." : networkFailed ? "Tentar de novo" : "Enviar Cadastro"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", fontSize: "14px", color: "var(--stone-500)", margin: "24px 0 0" }}>
          Já tem conta?{" "}
          <Link href="/login" style={{ color: "var(--ochre)", fontWeight: 600, textDecoration: "none" }}>
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
