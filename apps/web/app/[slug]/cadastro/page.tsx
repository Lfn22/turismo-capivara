"use client"
import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

export default function CadastroCondutorPage() {
  const params = useParams<{ slug: string }>()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [cpf, setCpf] = useState("")
  const [password, setPassword] = useState("")
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

    setLoading(true)
    try {
      const res = await fetch(`/api/tenants/${params.slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, cpf: cpfDigits, role: "CONDUTOR" }),
      })
      if (res.ok) {
        setSuccess(true)
        return
      }
      const data = await res.json().catch(() => ({}))
      if (res.status === 409) {
        setError(data.message ?? "E-mail ou CPF já cadastrado.")
      } else if (res.status === 404) {
        setError("Operadora não encontrada. Verifique o link de cadastro.")
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

  if (success) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          background: "var(--stone-50)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            background: "white",
            border: "1px solid var(--stone-200)",
            borderRadius: "8px",
            padding: "clamp(32px, 5vw, 48px) clamp(24px, 5vw, 40px)",
            width: "100%",
            maxWidth: "480px",
            textAlign: "center",
          }}
        >
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
            {params.slug}
          </p>
          <div
            style={{
              width: "48px",
              height: "48px",
              background: "#F0FDF4",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              fontSize: "24px",
            }}
          >
            ✓
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "24px",
              fontWeight: 400,
              color: "var(--stone-900)",
              marginBottom: "12px",
            }}
          >
            Cadastro enviado
          </h1>
          <p style={{ fontSize: "15px", color: "var(--stone-600)", lineHeight: 1.6, marginBottom: "32px" }}>
            Seu cadastro foi recebido e está aguardando aprovação da operadora.
            Você receberá um e-mail quando for aprovado.
          </p>
          <Link
            href={`/${params.slug}/login`}
            style={{
              display: "inline-block",
              padding: "10px 24px",
              background: "var(--ochre)",
              color: "white",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
              letterSpacing: "0.04em",
            }}
          >
            Ir para o login
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--stone-50)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "white",
          border: "1px solid var(--stone-200)",
          borderRadius: "8px",
          padding: "clamp(32px, 5vw, 48px) clamp(24px, 5vw, 40px)",
          width: "100%",
          maxWidth: "480px",
        }}
      >
        <Link
          href="/"
          style={{
            display: "block",
            marginBottom: "24px",
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--stone-500)",
            textDecoration: "none",
          }}
        >
          ← CAPI
        </Link>

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
          {params.slug}
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "24px",
            fontWeight: 400,
            color: "var(--stone-900)",
            marginBottom: "8px",
          }}
        >
          Seja um Guia
        </h1>
        <p style={{ fontSize: "14px", color: "var(--stone-500)", marginBottom: "32px" }}>
          Crie sua conta como condutor nesta operadora.
        </p>

        {error && (
          <div
            role="alert"
            aria-live="polite"
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
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="name"
              style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "var(--stone-700)", marginBottom: "6px" }}
            >
              Nome completo
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--stone-200)",
                borderRadius: "4px",
                fontSize: "16px",
                fontFamily: "var(--font-body)",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="email"
              style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "var(--stone-700)", marginBottom: "6px" }}
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--stone-200)",
                borderRadius: "4px",
                fontSize: "16px",
                fontFamily: "var(--font-body)",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="cpf"
              style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "var(--stone-700)", marginBottom: "6px" }}
            >
              CPF
            </label>
            <input
              id="cpf"
              type="text"
              inputMode="numeric"
              required
              placeholder="Somente números (11 dígitos)"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--stone-200)",
                borderRadius: "4px",
                fontSize: "16px",
                fontFamily: "var(--font-body)",
                boxSizing: "border-box",
              }}
            />
            <p style={{ fontSize: "12px", color: "var(--stone-400)", marginTop: "4px" }}>
              Armazenado de forma segura (LGPD)
            </p>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label
              htmlFor="password"
              style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "var(--stone-700)", marginBottom: "6px" }}
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--stone-200)",
                borderRadius: "4px",
                fontSize: "16px",
                fontFamily: "var(--font-body)",
                boxSizing: "border-box",
              }}
            />
            <p style={{ fontSize: "12px", color: "var(--stone-400)", marginTop: "4px" }}>
              Mínimo 8 caracteres
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              minHeight: "44px",
              background: loading ? "var(--stone-400)" : "var(--ochre)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
            {loading ? "Cadastrando…" : "Cadastrar como Guia"}
          </button>
        </form>

        <p
          style={{
            fontSize: "14px",
            color: "var(--stone-500)",
            textAlign: "center",
            marginTop: "24px",
          }}
        >
          Já tem conta?{" "}
          <Link
            href={`/${params.slug}/login`}
            style={{ color: "var(--ochre)", fontWeight: 600, textDecoration: "none" }}
          >
            Entrar no painel
          </Link>
        </p>
      </div>
    </main>
  )
}
