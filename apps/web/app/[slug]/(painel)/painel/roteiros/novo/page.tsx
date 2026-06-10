"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import BackButton from "@/src/components/ui/BackButton"

const DIFFICULTIES = [
  { value: "EASY", label: "Fácil" },
  { value: "MODERATE", label: "Moderado" },
  { value: "HARD", label: "Difícil" },
]

export default function NovoRoteiroPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    duration: "",
    capacity: "",
    difficulty: "MODERATE",
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tenants/${slug}/packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          price: parseFloat(form.price),
          duration: parseInt(form.duration, 10),
          capacity: parseInt(form.capacity, 10),
          difficulty: form.difficulty,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "Erro ao criar roteiro" }))
        throw new Error(data.message ?? "Erro ao criar roteiro")
      }
      router.push(`/${slug}/painel/roteiros`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <BackButton />
      <div style={{ marginBottom: "32px" }}>
        <p style={{ fontSize: "11px", color: "var(--ochre)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "8px" }}>
          Painel do Guia
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "24px", color: "var(--stone-900)", lineHeight: 1.2 }}>
          Novo Roteiro
        </h1>
      </div>

      {error && (
        <div style={{ marginBottom: "16px", padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "14px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: "640px" }}>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px", color: "var(--stone-700)" }}>
            Nome do roteiro *
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Ex: Trilha Serra da Capivara — Nível Iniciante"
            style={{ width: "100%", border: "1px solid var(--stone-300)", borderRadius: "6px", padding: "8px 12px", fontSize: "14px", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px", color: "var(--stone-700)" }}>
            Descrição *
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            rows={4}
            placeholder="Descreva o roteiro, o que está incluso, pontos de interesse..."
            style={{ width: "100%", border: "1px solid var(--stone-300)", borderRadius: "6px", padding: "8px 12px", fontSize: "14px", boxSizing: "border-box", resize: "vertical" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px", color: "var(--stone-700)" }}>
              Preço por pessoa (R$) *
            </label>
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange}
              required
              placeholder="150.00"
              style={{ width: "100%", border: "1px solid var(--stone-300)", borderRadius: "6px", padding: "8px 12px", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px", color: "var(--stone-700)" }}>
              Duração (horas) *
            </label>
            <input
              name="duration"
              type="number"
              min="1"
              max="72"
              value={form.duration}
              onChange={handleChange}
              required
              placeholder="6"
              style={{ width: "100%", border: "1px solid var(--stone-300)", borderRadius: "6px", padding: "8px 12px", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px", color: "var(--stone-700)" }}>
              Capacidade máxima *
            </label>
            <input
              name="capacity"
              type="number"
              min="1"
              max="100"
              value={form.capacity}
              onChange={handleChange}
              required
              placeholder="12"
              style={{ width: "100%", border: "1px solid var(--stone-300)", borderRadius: "6px", padding: "8px 12px", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px", color: "var(--stone-700)" }}>
              Dificuldade *
            </label>
            <select
              name="difficulty"
              value={form.difficulty}
              onChange={handleChange}
              style={{ width: "100%", border: "1px solid var(--stone-300)", borderRadius: "6px", padding: "8px 12px", fontSize: "14px", boxSizing: "border-box" }}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="submit"
            disabled={isLoading}
            style={{ padding: "10px 24px", background: "var(--ochre)", color: "white", border: "none", borderRadius: "6px", fontWeight: 600, fontSize: "14px", cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.6 : 1 }}
          >
            {isLoading ? "Criando..." : "Criar Roteiro"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ padding: "10px 24px", background: "transparent", color: "var(--stone-700)", border: "1px solid var(--stone-300)", borderRadius: "6px", fontWeight: 500, fontSize: "14px", cursor: "pointer" }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </>
  )
}
