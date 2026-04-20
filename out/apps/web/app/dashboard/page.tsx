"use client"

import { useState } from "react"

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "", tenantSlug: "serra-viva" })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setLoading(true)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
      const res = await fetch(baseUrl + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setErro(data.message ?? "Credenciais inválidas.")
        return
      }

      localStorage.setItem("token", data.token)
      window.location.href = "/dashboard/reservas"
    } catch {
      setErro("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--stone-900)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>

        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <p style={{
            fontSize: "11px",
            color: "var(--ochre-light)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "12px",
          }}>
            Serra da Capivara Turismo
          </p>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "32px",
            color: "var(--stone-50)",
            letterSpacing: "-0.02em",
          }}>
            Painel administrativo
          </h1>
        </div>

        <div style={{
          background: "white",
          border: "1px solid var(--stone-200)",
          borderRadius: "8px",
          padding: "40px",
        }}>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "20px" }}>

            <div>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--stone-600)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}>
                E-mail
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="seu@email.com"
                style={{
                  width: "100%",
                  background: "var(--stone-50)",
                  border: "1px solid var(--stone-200)",
                  borderRadius: "4px",
                  padding: "12px 16px",
                  fontSize: "15px",
                  color: "var(--stone-900)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--ochre)"}
                onBlur={(e) => e.target.style.borderColor = "var(--stone-200)"}
              />
            </div>

            <div>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--stone-600)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}>
                Senha
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  background: "var(--stone-50)",
                  border: "1px solid var(--stone-200)",
                  borderRadius: "4px",
                  padding: "12px 16px",
                  fontSize: "15px",
                  color: "var(--stone-900)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--ochre)"}
                onBlur={(e) => e.target.style.borderColor = "var(--stone-200)"}
              />
            </div>

            {erro && (
              <div style={{
                background: "#FFF1ED",
                border: "1px solid #F5C2A8",
                borderRadius: "4px",
                padding: "12px 16px",
                fontSize: "14px",
                color: "#8A2E0F",
              }}>
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? "var(--stone-300)" : "var(--ochre)",
                color: "white",
                border: "none",
                padding: "14px 24px",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: "600",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

          </form>
        </div>

        <p style={{
          textAlign: "center",
          fontSize: "12px",
          color: "var(--stone-500)",
          marginTop: "24px",
        }}>
          <a href="/" style={{ color: "var(--stone-400)", textDecoration: "none" }}>
            ← Voltar ao site
          </a>
        </p>

      </div>
    </div>
  )
}