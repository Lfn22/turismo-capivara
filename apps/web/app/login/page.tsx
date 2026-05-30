"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await signIn("credentials", {
        email,
        password,
        tenantSlug: "capi-platform",
        redirect: false,
        callbackUrl: "/super-admin/operadoras",
      })
      if (!result?.ok) {
        setError("Credenciais inválidas. Verifique seu email e senha.")
        return
      }
      router.push("/super-admin/operadoras")
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
          padding: "48px 40px",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            color: "var(--ochre)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          <a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>CAPI</a> · Plataforma
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "24px",
            color: "var(--stone-900)",
            marginBottom: "32px",
            lineHeight: 1.2,
          }}
        >
          Acesso Administrativo
        </h1>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label
              htmlFor="email"
              style={{ display: "block", fontSize: "14px", color: "var(--stone-700)", marginBottom: "4px", fontWeight: 600 }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--stone-300)",
                borderRadius: "4px",
                fontSize: "16px",
                color: "var(--stone-800)",
                background: "white",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{ display: "block", fontSize: "14px", color: "var(--stone-700)", marginBottom: "4px", fontWeight: 600 }}
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--stone-300)",
                borderRadius: "4px",
                fontSize: "16px",
                color: "var(--stone-800)",
                background: "white",
              }}
            />
          </div>

          {(error || urlError === "forbidden") && (
            <p
              role="alert"
              aria-live="polite"
              style={{ fontSize: "14px", color: "#DC2626", margin: 0 }}
            >
              {error ?? "Acesso restrito. Faça login como administrador."}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "var(--stone-400)" : "var(--ochre)",
              color: "white",
              padding: "10px 20px",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "8px",
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
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
