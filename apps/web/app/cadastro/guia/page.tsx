"use client"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"

export default function CadastroGuiaIndependentePage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [cpf, setCpf] = useState("")
  const [password, setPassword] = useState("")
  const [cadastur, setCadastur] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function formatCpf(value: string) {
    return value.replace(/\D/g, "").slice(0, 11)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cpfDigits = cpf.replace(/\D/g, "")
    if (cpfDigits.length !== 11) {
      setError("CPF deve conter 11 dígitos numéricos.")
      return
    }
    if (!cadastur.trim()) {
      setError("Número CADASTUR é obrigatório.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/register-independent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, cpf: cpfDigits, cadastur: cadastur.trim() }),
      })
      if (res.ok) {
        setSuccess(true)
        return
      }
      const data = await res.json().catch(() => ({}))
      if (res.status === 409) {
        setError(data.message ?? "E-mail ou CPF já cadastrado.")
      } else if (data.errors?.length) {
        setError(data.errors[0].message)
      } else {
        setError(data.message ?? "Erro ao criar conta. Tente novamente.")
      }
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

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

  if (success) {
    return (
      <main style={{ minHeight: "100dvh", background: "var(--stone-50)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <p style={{ fontSize: "40px", marginBottom: "16px" }}>✅</p>
          <h1 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "clamp(22px, 4vw, 28px)", color: "var(--stone-900)", marginBottom: "12px" }}>
            Cadastro enviado!
          </h1>
          <p style={{ fontSize: "15px", color: "var(--stone-600)", marginBottom: "24px", lineHeight: 1.6 }}>
            Seu cadastro foi recebido e está aguardando análise. Você receberá um e-mail quando for aprovado.
          </p>
          <Link href="/explorar" style={{ color: "var(--ochre)", fontWeight: 600, textDecoration: "none" }}>
            Voltar para o início
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: "100dvh", background: "var(--stone-50)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Link href="/" style={{ display: "inline-block", marginBottom: "20px" }}>
            <Image src="/images/logo.png" alt="CAPI" width={64} height={58} style={{ display: "block" }} />
          </Link>
          <h1 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "clamp(22px, 4vw, 28px)", color: "var(--stone-900)", margin: "0 0 8px" }}>
            Cadastro de Guia
          </h1>
          <p style={{ fontSize: "14px", color: "var(--stone-500)", margin: 0 }}>
            Sem vínculo com operadora · Aprovação pelo administrador
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              placeholder="Somente números"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="cadastur" style={labelStyle}>Número CADASTUR</label>
            <input
              id="cadastur"
              type="text"
              value={cadastur}
              onChange={(e) => setCadastur(e.target.value)}
              placeholder="Ex: MT-012345/2024"
              required
              style={inputStyle}
            />
            <p style={{ fontSize: "13px", color: "var(--stone-400)", marginTop: "4px" }}>
              Registro no Cadastro dos Prestadores de Serviços Turísticos (CADASTUR/MTur)
            </p>
          </div>

          <div>
            <label htmlFor="password" style={labelStyle}>Senha</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={inputStyle} autoComplete="new-password" />
            <p style={{ fontSize: "13px", color: "var(--stone-400)", marginTop: "4px" }}>Mínimo 8 caracteres</p>
          </div>

          {error && (
            <p role="alert" style={{ fontSize: "14px", color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "4px", padding: "10px 12px", margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "var(--stone-400)" : "var(--stone-900)",
              color: "white",
              padding: "12px 16px",
              borderRadius: "4px",
              fontSize: "15px",
              fontWeight: 600,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              minHeight: "48px",
            }}
          >
            {loading ? "Enviando..." : "Enviar Cadastro"}
          </button>

          <p style={{ textAlign: "center", fontSize: "14px", color: "var(--stone-500)", margin: 0 }}>
            Já tem conta?{" "}
            <Link href="/auth/login" style={{ color: "var(--ochre)", fontWeight: 600, textDecoration: "none" }}>
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
