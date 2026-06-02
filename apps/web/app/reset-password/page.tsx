"use client"
import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { resetPassword } from "@/lib/auth-client"

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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--stone-700)",
  marginBottom: "4px",
  fontFamily: "var(--font-body)",
}

const btnStyle = (disabled: boolean): React.CSSProperties => ({
  display: "block",
  width: "100%",
  minHeight: "44px",
  background: disabled ? "var(--stone-400)" : "var(--ochre)",
  color: "white",
  border: "none",
  borderRadius: "4px",
  fontSize: "16px",
  fontWeight: 600,
  fontFamily: "var(--font-body)",
  cursor: disabled ? "not-allowed" : "pointer",
  marginTop: "28px",
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

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const userId = searchParams.get("userId")
  const token = searchParams.get("token")

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const tokenMissing = !userId || !token

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.")
      return
    }

    if (newPassword.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.")
      return
    }

    setLoading(true)
    try {
      await resetPassword(userId!, token!, newPassword)
      setSuccess(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.toLowerCase().includes("expir") || msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("inválid")) {
        setError("O link de recuperação é inválido ou já expirou.")
      } else {
        setError("Erro de conexão. Verifique sua internet e tente novamente.")
      }
    } finally {
      setLoading(false)
    }
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
        <Link href="/" style={{ display: "inline-block", marginBottom: "20px" }}>
          <Image
            src="/images/logo.png"
            alt="CAPI"
            width={80}
            height={72}
            style={{ display: "block" }}
          />
        </Link>

        <p
          style={{
            fontSize: "11px",
            fontWeight: 600,
            fontFamily: "var(--font-body)",
            color: "var(--ochre)",
            letterSpacing: "0.06em",
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
            marginBottom: "28px",
          }}
        >
          Criar nova senha
        </h1>

        {tokenMissing ? (
          <>
            <div role="alert" style={alertStyle}>
              O link de recuperação é inválido ou já expirou.
            </div>
            <p style={{ fontSize: "14px", fontFamily: "var(--font-body)" }}>
              <Link
                href="/login/esqueci-a-senha"
                style={{ color: "var(--ochre)", fontWeight: 600, textDecoration: "none" }}
              >
                Solicitar novo link →
              </Link>
            </p>
            <p style={{ marginTop: "16px", fontSize: "14px", fontFamily: "var(--font-body)" }}>
              <Link
                href="/login"
                style={{ color: "var(--ochre)", fontWeight: 600, textDecoration: "none" }}
              >
                ← Voltar para o login
              </Link>
            </p>
          </>
        ) : success ? (
          <>
            <p
              style={{
                fontSize: "16px",
                fontFamily: "var(--font-body)",
                color: "var(--stone-900)",
                marginBottom: "20px",
              }}
            >
              Senha redefinida com sucesso.
            </p>
            <Link
              href="/login"
              style={{ color: "var(--ochre)", fontWeight: 600, textDecoration: "none", fontSize: "14px", fontFamily: "var(--font-body)" }}
            >
              Acessar o painel →
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div role="alert" aria-live="polite" style={alertStyle}>
                {error}
                {error.includes("expirou") && (
                  <>
                    {" "}
                    <Link
                      href="/login/esqueci-a-senha"
                      style={{ color: "#DC2626", fontWeight: 600, textDecoration: "underline" }}
                    >
                      Solicitar novo link →
                    </Link>
                  </>
                )}
              </div>
            )}

            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="newPassword" style={labelStyle}>Nova senha</label>
              <input
                id="newPassword"
                type="password"
                required
                minLength={8}
                autoFocus
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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

            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="confirmPassword" style={labelStyle}>Confirmar nova senha</label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? "Redefinindo…" : "Redefinir senha"}
            </button>

            <p style={{ marginTop: "20px", fontSize: "14px", fontFamily: "var(--font-body)" }}>
              <Link
                href="/login"
                style={{ color: "var(--ochre)", fontWeight: 600, textDecoration: "none" }}
              >
                ← Voltar para o login
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
