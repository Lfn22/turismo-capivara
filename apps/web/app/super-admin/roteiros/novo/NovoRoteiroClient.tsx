'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Alert, Button, Input, PageHeader, Select, Textarea } from '@/src/components/ui/capi'
import PainelCard from '@/src/components/painel/PainelCard'
import { useOperadoras } from '../useOperadoras'

const DIFFICULTIES = [
  { value: 'EASY', label: 'Fácil' },
  { value: 'MODERATE', label: 'Moderado' },
  { value: 'HARD', label: 'Difícil' },
]

export default function NovoRoteiroClient({ initialSlug }: { initialSlug: string }) {
  const router = useRouter()
  const { operadoras, loading: opsLoading, error: opsError } = useOperadoras()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    operadora: initialSlug,
    name: '',
    description: '',
    price: '',
    duration: '',
    capacity: '',
    difficulty: 'MODERATE',
  })

  const backHref = form.operadora
    ? `/super-admin/roteiros?operadora=${form.operadora}`
    : '/super-admin/roteiros'

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
      const res = await fetch(`/api/tenants/${form.operadora}/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        const data = await res.json().catch(() => ({ message: 'Erro ao criar roteiro' }))
        throw new Error(data.message ?? 'Erro ao criar roteiro')
      }
      router.push(backHref)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="capi-container capi-container--text" style={{ paddingInline: 0 }}>
      <PageHeader
        backHref={backHref}
        backLabel="Roteiros"
        eyebrow="Catálogo"
        title="Novo roteiro"
        description="O roteiro nasce como rascunho da operadora escolhida. Fotos e experiências você adiciona depois, no site."
      />

      {error && (
        <div className="mb-4">
          <Alert tone="danger" title="Não foi possível criar o roteiro">
            {error}
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PainelCard title="Operadora">
          <Select
            name="operadora"
            label="Operadora dona do roteiro"
            hint="O roteiro aparece no destino dessa operadora, e o admin dela aprova os guias que pedirem para atuar."
            value={form.operadora}
            onChange={handleChange}
            required
            disabled={opsLoading}
            error={opsError ? 'Não foi possível carregar as operadoras.' : undefined}
            options={[
              { value: '', label: opsLoading ? 'Carregando...' : 'Escolha uma operadora' },
              ...operadoras.map((o) => ({ value: o.slug, label: o.name })),
            ]}
          />
        </PainelCard>

        <PainelCard title="Sobre o roteiro">
          <div className="flex flex-col gap-4">
            <Input
              name="name"
              label="Nome do roteiro"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Ex: Circuito Serra das Confusões — Dia inteiro"
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

        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" href={backHref}>
            Cancelar
          </Button>
          <Button type="submit" iconLeft={Check} loading={isLoading} disabled={!form.operadora}>
            {isLoading ? 'Criando...' : 'Criar roteiro'}
          </Button>
        </div>
      </form>
    </div>
  )
}
