'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DestinationForm, DestinationFormValues } from '@/src/components/ui/DestinationForm'
import BackButton from '@/src/components/ui/BackButton'

export default function NovosDestinoPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (values: DestinationFormValues) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tenants/${slug}/destinations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          state: values.state,
          photos: values.photos,
          highlights: values.highlights.filter(Boolean),
          heroImageUrl: values.heroImageUrl ?? null,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erro ao criar local' }))
        toast.error(err.message ?? 'Erro ao criar local')
        return
      }

      toast.success('Local criado. Aguardando aprovação.')
      router.push(`/${slug}/painel/destinos`)
    } catch {
      toast.error('Falha ao criar local. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <BackButton />

      <div style={{ marginBottom: '32px' }}>
        <p
          style={{
            fontSize: '11px',
            color: 'var(--ochre)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          Painel do Guia
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '24px',
            color: 'var(--stone-900)',
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          Criar Local
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--stone-500)', marginTop: '8px' }}>
          Preencha as informações do local. Ele ficará pendente de aprovação até ser revisado.
        </p>
      </div>

      <DestinationForm
        slug={slug}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Criar destino"
        onCancel={() => router.push(`/${slug}/painel/destinos`)}
      />
    </div>
  )
}
