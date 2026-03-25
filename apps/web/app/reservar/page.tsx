"use client"

import { useState } from "react"

interface FormData {
  customerName: string
  customerEmail: string
  customerPhone: string
  pax: number
}

export default function ReservarPage() {
  const [form, setForm] = useState<FormData>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    pax: 1,
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  function getParams() {
    if (typeof window === "undefined") return { slotId: "", tenant: "" }
    const p = new URLSearchParams(window.location.search)
    return {
      slotId: p.get("slot") ?? "",
      tenant: p.get("tenant") ?? "serra-viva",
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setLoading(true)

    const { slotId, tenant } = getParams()

    if (!slotId) {
      setErro("Slot de reserva inválido. Volte e selecione uma data.")
      setLoading(false)
      return
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
      const res = await fetch(baseUrl + "/tenants/" + tenant + "/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          pax: form.pax,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErro(data.message ?? "Erro ao realizar reserva.")
        return
      }

      setSucesso(true)
    } catch {
      setErro("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (sucesso) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--stone-900)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}>
        <div style={{
          background: "white",
          border: "1px solid var(--stone-200)",
          borderRadius: "8px",
          padding: "48px",
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            background: "var(--stone-100)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            border: "1px solid var(--stone-200)",
          }}>
            <span style={{ color: "var(--ochre)", fontSize: "20px" }}>✓</span>
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "28px",
            color: "var(--stone-900)",
            letterSpacing: "-0.02em",
            marginBottom: "12px",
          }}>
            Reserva solicitada
          </h1>
          <p style={{
            fontSize: "15px",
            color: "var(--stone-500)",
            lineHeight: "1.7",
            marginBottom: "32px",
          }}>
            Entraremos em contato via WhatsApp para confirmar os detalhes e o pagamento via Pix.
          </p>
          <a href="/roteiros" style={{
            display: "inline-block",
            background: "var(--ochre)",
            color: "white",
            padding: "12px 32px",
            borderRadius: "4px",
            fontSize: "13px",
            fontWeight: "600",
            textDecoration: "none",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}>
            Ver outros roteiros
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--stone-50)" }}>

      <nav style={{
        background: "var(--stone-900)",
        borderBottom: "1px solid var(--stone-700)",
        padding: "20px 24px",
      }}>
        <div style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <a href="/" style={{
            fontFamily: "var(--font-display)",
            fontSize: "18px",
            color: "var(--stone-100)",
            textDecoration: "none",
            letterSpacing: "-0.02em",
          }}>
            Serra da Capivara
          </a>
          <a href="/roteiros" style={{
            fontSize: "13px",
            color: "var(--stone-400)",
            textDecoration: "none",
          }}>
            ← Voltar para roteiros
          </a>
        </div>
      </nav>

      <section style={{
        background: "var(--stone-900)",
        padding: "64px 24px 48px",
        borderBottom: "1px solid var(--stone-700)",
      }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <p style={{
            fontSize: "11px",
            color: "var(--ochre-light)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "16px",
          }}>
            Reserva
          </p>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 4vw, 44px)",
            color: "var(--stone-50)",
            letterSpacing: "-0.03em",
            marginBottom: "12px",
          }}>
            Solicitar reserva
          </h1>
          <p style={{ fontSize: "15px", color: "var(--stone-400)", lineHeight: "1.6" }}>
            Preencha seus dados. Entraremos em contato para confirmar o pagamento.
          </p>
        </div>
      </section>

      <main style={{ maxWidth: "600px", margin: "0 auto", padding: "48px 24px" }}>
        <div style={{
          background: "white",
          border: "1px solid var(--stone-200)",
          borderRadius: "8px",
          padding: "40px",
        }}>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "24px" }}>

            {[
              { label: "Nome completo", key: "customerName", type: "text", placeholder: "Seu nome completo" },
              { label: "E-mail", key: "customerEmail", type: "email", placeholder: "seu@email.com" },
              { label: "Telefone / WhatsApp", key: "customerPhone", type: "tel", placeholder: "(89) 99999-0000" },
            ].map((field) => (
              <div key={field.key}>
                <label style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "var(--stone-600)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  required
                  placeholder={field.placeholder}
                  value={form[field.key as keyof FormData] as string}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
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
            ))}

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
                Número de pessoas
              </label>
              <input
                type="number"
                required
                min={1}
                max={20}
                value={form.pax}
                onChange={(e) => setForm({ ...form, pax: Number(e.target.value) })}
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
              {loading ? "Enviando..." : "Solicitar reserva"}
            </button>

          </form>
        </div>

        <p style={{
          textAlign: "center",
          fontSize: "12px",
          color: "var(--stone-400)",
          marginTop: "16px",
          lineHeight: "1.6",
        }}>
          Após a solicitação, entraremos em contato via WhatsApp para confirmar.
        </p>
      </main>
    </div>
  )
}