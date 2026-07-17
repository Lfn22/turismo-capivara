'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DestinationForm, DestinationFormValues } from '@/src/components/ui/DestinationForm'
import { DestinationStatusBadge } from '@/src/components/ui/DestinationStatusBadge'
import BackButton from '@/src/components/ui/BackButton'

interface DestinationData {
  id: string
  title: string
  description: string
  state: string
  photos: string[]
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdById: string | null
}

export default function EditarDestinoPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>()
  const router = useRouter()

  const [destination, setDestination] = useState<DestinationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/tenants/${slug}/destinations/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        // API returns { destination: {...} } or the object directly
        setDestination(data.destination ?? data)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [slug, id])

  const handleSubmit = async (values: DestinationFormValues) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tenants/${slug}/destinations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          state: values.state,
          photos: values.photos,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erro ao atualizar local' }))
        toast.error(err.message ?? 'Erro ao atualizar local')
        return
      }

      toast.success('Local atualizado.')
      router.push(`/${slug}/painel/destinos`)
    } catch {
      toast.error('Falha ao atualizar local. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <p style={{ textAlign: 'center', padding: '48px 24px', fontSize: '16px', color: 'var(--stone-500)' }}>
        Carregando local...
      </p>
    )
  }

  if (loadError || !destination) {
    return (
      <p style={{ textAlign: 'center', padding: '48px 24px', fontSize: '16px', color: 'var(--stone-500)' }}>
        Local não encontrado.
      </p>
    )
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              color: 'var(--stone-900)',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Editar Local
          </h1>
          <DestinationStatusBadge status={destination.approvalStatus} />
        </div>
        <p style={{ fontSize: '14px', color: 'var(--stone-500)', marginTop: '8px' }}>
          {destination.approvalStatus === 'APPROVED'
            ? 'Este local está aprovado e visível no marketplace.'
            : destination.approvalStatus === 'REJECTED'
            ? 'Este local foi rejeitado. Edite e aguarde nova revisão.'
            : 'Este local está aguardando aprovação.'}
        </p>
      </div>

      <DestinationForm
        slug={slug}
        initialValues={{
          name: destination.title,
          description: destination.description,
          state: destination.state,
          photos: destination.photos,
        }}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Salvar destino"
        onCancel={() => router.push(`/${slug}/painel/destinos`)}
      />
    </div>
  )
}
