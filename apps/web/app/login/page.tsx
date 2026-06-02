"use client"
import { signIn, getSession } from "next-auth/react"
import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { lookupTenant } from "@/lib/auth-client"

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
  padding: "0 0",
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

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")

  const [step, setStep] = useState<"email" | "password">("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [tenantName, setTenantName] = useState("")
  const [tenantSlug, setTenantSlug] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await lookupTenant(email.trim())
      if (!result) {
        setError("Nenhuma conta encontrada com esse email.")
        return
      }
      setTenantName(result.tenantName)
      setTenantSlug(result.tenantSlug)
      setStep("password")
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await signIn("credentials", {
        email,
        password,
        tenantSlug,
        redirect: false,
      })
      if (!result?.ok) {
        setError("Email ou senha incorretos.")
        return
      }
      const session = await getSession()
      const role = (session?.user as { role?: string })?.role
      if (role === "SUPER_ADMIN") {
        router.push("/super-admin/operadoras")
      } else if (role === "ADMIN") {
        router.push(`/${tenantSlug}/admin/guias`)
      } else {
        router.push(`/${tenantSlug}/painel/dashboard`)
      }
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  function goBackToEmail() {
    setStep("email")
    setPassword("")
    setError(null)
    setTenantName("")
    setTenantSlug("")
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
          Acessar o Painel
        </h1>

        {(urlError === "forbidden") && (
          <div role="alert" aria-live="polite" style={alertStyle}>
            Acesso restrito. Faça login para continuar.
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit}>
            {error && (
              <div role="alert" aria-live="polite" style={alertStyle}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="email" style={labelStyle}>Email</label>
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
              {loading ? "Verificando…" : "Continuar"}
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                margin: "24px 0",
              }}
            >
              <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--stone-200)" }} />
              <span style={{ fontSize: "14px", color: "var(--stone-500)", fontFamily: "var(--font-body)" }}>
                ou
              </span>
              <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--stone-200)" }} />
            </div>

            <p style={{ textAlign: "center", fontSize: "14px", fontFamily: "var(--font-body)", color: "var(--stone-500)" }}>
              <Link
                href="/onboarding"
                style={{ color: "var(--ochre)", fontWeight: 600, textDecoration: "none" }}
              >
                Cadastrar agência ou guia →
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit}>
            <div
              style={{
                marginBottom: "20px",
                display: "flex",
                alignItems: "baseline",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  color: "var(--stone-700)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                }}
              >
                {tenantName}
              </span>
              <button
                type="button"
                onClick={goBackToEmail}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "14px",
                  color: "var(--ochre)",
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Não é você?
              </button>
            </div>

            {error && (
              <div role="alert" aria-live="polite" style={alertStyle}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: "8px" }}>
              <label htmlFor="password" style={labelStyle}>Senha</label>
              <input
                id="password"
                type="password"
                required
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            <div style={{ textAlign: "right", marginBottom: "4px" }}>
              <Link
                href="/login/esqueci-a-senha"
                style={{
                  fontSize: "14px",
                  color: "var(--ochre)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Esqueceu a senha?
              </Link>
            </div>

            <button type="submit" disabled={loading} style={btnStyle(loading)}>
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
