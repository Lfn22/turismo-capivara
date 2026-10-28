"use client"
import { useState, useEffect, FormEvent } from "react"
import { toast } from "sonner"

interface PlatformAdmin {
  id: string
  name: string
  email: string
  createdAt: string
}

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid var(--stone-200)",
  borderRadius: "4px",
  fontSize: "14px",
  fontFamily: "var(--font-body)",
  background: "white",
  color: "var(--stone-800)",
  boxSizing: "border-box" as const,
}

async function errorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json()
    return data?.message ?? fallback
  } catch {
    return fallback
  }
}

export default function SuperAdminAdminsPage() {
  const [admins, setAdmins] = useState<PlatformAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  function loadAdmins() {
    setLoading(true)
    setLoadError(false)
    fetch("/api/super-admin/platform-admins")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => setAdmins(data.admins ?? []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch("/api/super-admin/platform-admins")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => setAdmins(data.admins ?? []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/api/super-admin/platform-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      if (!res.ok) {
        toast.error(await errorMessage(res, "Não foi possível adicionar o admin."))
        return
      }
      const created: PlatformAdmin = await res.json()
      setAdmins((prev) => [...prev, created])
      setName("")
      setEmail("")
      setPassword("")
      toast.success("Admin adicionado.")
    } catch {
      toast.error("Não foi possível adicionar o admin.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(admin: PlatformAdmin) {
    if (!confirm(`Remover ${admin.name} como admin?`)) return
    setRemoving(admin.id)
    try {
      const res = await fetch(`/api/super-admin/platform-admins/${admin.id}`, { method: "DELETE" })
      if (!res.ok) {
        toast.error(await errorMessage(res, "Não foi possível remover o admin."))
        return
      }
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id))
      toast.success("Admin removido.")
    } catch {
      toast.error("Não foi possível remover o admin.")
    } finally {
      setRemoving(null)
    }
  }

  return (
    <>
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
        SUPER ADMIN
      </p>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "24px",
          fontWeight: 400,
          color: "var(--stone-900)",
          marginBottom: "32px",
        }}
      >
        Admins
      </h1>

      <form
        onSubmit={handleAdd}
        style={{
          background: "white",
          border: "1px solid var(--stone-200)",
          borderRadius: "4px",
          padding: "16px",
          marginBottom: "32px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
          alignItems: "end",
        }}
      >
        <h2 style={{ gridColumn: "1 / -1", fontSize: "16px", fontWeight: 600, color: "var(--stone-800)", margin: 0 }}>
          Adicionar admin
        </h2>
        <label style={{ fontSize: "13px", color: "var(--stone-700)" }}>
          Nome
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ fontSize: "13px", color: "var(--stone-700)" }}>
          E-mail
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ fontSize: "13px", color: "var(--stone-700)" }}>
          Senha (mín. 8 caracteres)
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          style={{
            background: submitting ? "var(--stone-400)" : "var(--ochre)",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: "4px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer",
            minHeight: "40px",
          }}
        >
          {submitting ? "Adicionando..." : "Adicionar"}
        </button>
      </form>

      {loading ? (
        <p style={{ fontSize: "14px", color: "var(--stone-500)" }}>Carregando...</p>
      ) : loadError ? (
        <div
          role="alert"
          style={{
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            borderRadius: "4px",
            padding: "16px",
            fontSize: "14px",
            color: "#DC2626",
          }}
        >
          Erro ao carregar admins.{" "}
          <button
            onClick={loadAdmins}
            style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", textDecoration: "underline", fontSize: "14px" }}
          >
            Tentar novamente
          </button>
        </div>
      ) : admins.length === 0 ? (
        <p style={{ textAlign: "center", padding: "48px 24px", fontSize: "16px", color: "var(--stone-500)" }}>
          Nenhum admin cadastrado ainda.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "var(--stone-100)" }}>
                {["Nome", "E-mail", "Desde", "Ações"].map((col) => (
                  <th
                    key={col}
                    style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--stone-700)", whiteSpace: "nowrap" }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admins.map((admin, index) => (
                <tr
                  key={admin.id}
                  style={{
                    background: index % 2 === 0 ? "white" : "var(--stone-50)",
                    borderBottom: "1px solid var(--stone-100)",
                  }}
                >
                  <td style={{ padding: "12px 16px", color: "var(--stone-800)" }}>{admin.name}</td>
                  <td style={{ padding: "12px 16px", color: "var(--stone-600)" }}>{admin.email}</td>
                  <td style={{ padding: "12px 16px", color: "var(--stone-600)", whiteSpace: "nowrap" }}>
                    {new Date(admin.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={() => handleRemove(admin)}
                      disabled={removing === admin.id}
                      aria-label={`Remover ${admin.name}`}
                      style={{
                        background: "#DC2626",
                        color: "white",
                        border: "none",
                        padding: "8px 12px",
                        borderRadius: "4px",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: removing === admin.id ? "not-allowed" : "pointer",
                        opacity: removing === admin.id ? 0.6 : 1,
                      }}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
