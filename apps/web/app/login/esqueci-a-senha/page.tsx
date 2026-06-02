"use client"
import { useState } from "react"
import Link from "next/link"
import { requestPasswordReset } from "@/lib/auth-client"

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "12px",
  border: "1px solid var(--stone-200)",
  borderRadius: "4px",
  fontSize: "16px",
  fontFamily: "var(--font-body)",
  color: "var(--stone-900)",
  background: "white",
  boxSizing: "border-box",
}

const btnStyle = (disabled: boolean): React.CSSProperties => ({
  display: "block",
  width: "100%",
  padding: "12px",
  background: disabled ? "var(--stone-200)" : "var(--ochre)",
  color: disabled ? "var(--stone-500)" : "white",
  border: "none",
  borderRadius: "4px",
  fontSize: "16px",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  marginTop: "8px",
})

const alertStyle: React.CSSProperties = {
  background: "#FEF2F2",
  border: "1px solid #FCA5A5",
  borderRadius: "4px",
  padding: "8px 12px",
  marginBottom: "16px",
  fontSize: "14px",
  color: "#DC2626",
}

const successStyle: React.CSSProperties = {
  background: "#F0FDF4",
  border: "1px solid #86EFAC",
  borderRadius: "4px",
  padding: "12px",
  marginBottom: "16px",
  fontSize: "14px",
  color: "#15803D",
}

export default function EsqueciASenhaPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch {
      setError("Erro ao enviar. Tente novamente em instantes.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--stone-50, #FAFAF9)",
        padding: "clamp(16px, 4vw, 32px)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--ochre)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          CAPI
        </p>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "24px",
            fontWeight: 400,
            color: "var(--stone-900)",
            lineHeight: 1.2,
            marginBottom: "8px",
          }}
        >
          Recuperar senha
        </h1>

        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            color: "var(--stone-500)",
            marginBottom: "28px",
          }}
        >
          Informe seu email e enviaremos um link para redefinir sua senha.
        </p>

        {sent ? (
          <div>
            <div style={successStyle}>
              Se este email estiver cadastrado, você receberá as instruções em breve.
            </div>
            <Link
              href="/login"
              style={{
                display: "block",
                textAlign: "center",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                color: "var(--ochre)",
                fontWeight: 600,
                textDecoration: "none",
                marginTop: "16px",
              }}
            >
              ← Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div role="alert" aria-live="polite" style={alertStyle}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: "20px" }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontFamily: "var(--font-body)",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--stone-700)",
                  marginBottom: "6px",
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.outline = "2px solid var(--ochre)"
                  e.currentTarget.style.outlineOffset = "2px"
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = "none"
                }}
              />
            </div>

            <button type="submit" disabled={loading} style={btnStyle(loading)}>
              {loading ? "Enviando…" : "Enviar link de recuperação"}
            </button>

            <Link
              href="/login"
              style={{
                display: "block",
                textAlign: "center",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                color: "var(--stone-500)",
                textDecoration: "none",
                marginTop: "16px",
              }}
            >
              ← Voltar para o login
            </Link>
          </form>
        )}
      </div>
    </main>
  )
}
