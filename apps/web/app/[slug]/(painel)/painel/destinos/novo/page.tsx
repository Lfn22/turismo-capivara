'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DestinationForm, DestinationFormValues } from '@/src/components/ui/DestinationForm'
import BackButton from '@/src/components/ui/BackButton'
import { PageHeader } from '@/src/components/ui/capi'

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
        const err = await res.json().catch(() => ({ message: 'Erro ao criar destino' }))
        toast.error(err.message ?? 'Erro ao criar destino')
        return
      }

      toast.success('Destino enviado. Aguardando aprovação.')
      router.push(`/${slug}/painel/destinos`)
    } catch {
      toast.error('Não foi possível salvar o destino. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="capi-container capi-container--text" style={{ paddingInline: 0 }}>
      <BackButton fallbackHref={`/${slug}/painel/destinos`} />

      <PageHeader
        eyebrow="Destinos"
        title="Novo destino"
        description="Preencha as informações do destino. Ele fica em análise até ser revisado pela equipe."
      />

      <DestinationForm
        slug={slug}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Salvar destino"
        onCancel={() => router.push(`/${slug}/painel/destinos`)}
      />
    </div>
  )
}
