"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Check } from "lucide-react"
import { Alert, Button, Input, PageHeader, Select, Textarea } from "@/src/components/ui/capi"
import PainelCard from "@/src/components/painel/PainelCard"

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
    <div className="capi-container capi-container--text" style={{ paddingInline: 0 }}>
      <style>{`
        /* Ação de salvar fixa no rodapé do celular, acima da bottom nav */
        .painel-form-actions {
          position: sticky; z-index: var(--z-sticky);
          bottom: calc(var(--bottombar-height) + env(safe-area-inset-bottom, 0px));
          display: flex; flex-direction: column-reverse; gap: var(--space-2);
          margin: var(--space-6) calc(var(--gutter-mobile) * -1) 0;
          padding: var(--space-3) var(--gutter-mobile);
          background: var(--surface); border-top: 1px solid var(--border);
        }
        @media (min-width: 768px) {
          .painel-form-actions {
            position: static; flex-direction: row; justify-content: flex-end;
            margin: var(--space-6) 0 0; padding: 0; background: none; border: 0;
          }
        }
      `}</style>

      <PageHeader
        backHref={`/${slug}/painel/roteiros`}
        backLabel="Roteiros"
        eyebrow="Painel do guia"
        title="Novo roteiro"
        description="Preencha o básico agora. Fotos e experiências você adiciona depois."
      />

      {error && (
        <div className="mb-4">
          <Alert tone="danger" title="Não foi possível criar o roteiro">
            {error}
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PainelCard title="Sobre o roteiro">
          <div className="flex flex-col gap-4">
            <Input
              name="name"
              label="Nome do roteiro"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Ex: Trilha Serra da Capivara — Nível Iniciante"
            />
            <Textarea
              name="description"
              label="Descrição"
              value={form.description}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Descreva o roteiro, o que está incluso, pontos de interesse..."
            />
          </div>
        </PainelCard>

        <PainelCard title="Preço e duração">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              label="Preço por pessoa (R$)"
              value={form.price}
              onChange={handleChange}
              required
              placeholder="150.00"
            />
            <Input
              name="duration"
              type="number"
              inputMode="numeric"
              min="1"
              max="72"
              label="Duração (horas)"
              value={form.duration}
              onChange={handleChange}
              required
              placeholder="6"
            />
          </div>
        </PainelCard>

        <PainelCard title="Grupo e dificuldade">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="capacity"
              type="number"
              inputMode="numeric"
              min="1"
              max="100"
              label="Capacidade máxima"
              hint="Número máximo de pessoas por saída."
              value={form.capacity}
              onChange={handleChange}
              required
              placeholder="12"
            />
            <Select
              name="difficulty"
              label="Dificuldade"
              value={form.difficulty}
              onChange={handleChange}
              options={DIFFICULTIES}
            />
          </div>
        </PainelCard>

        <div className="painel-form-actions">
          <Button variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" iconLeft={Check} loading={isLoading}>
            {isLoading ? "Criando..." : "Criar roteiro"}
          </Button>
        </div>
      </form>
    </div>
  )
}
