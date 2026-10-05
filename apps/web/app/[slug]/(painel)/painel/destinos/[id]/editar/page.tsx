'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DestinationForm, DestinationFormValues } from '@/src/components/ui/DestinationForm'
import { DestinationStatusBadge } from '@/src/components/ui/DestinationStatusBadge'
import BackButton from '@/src/components/ui/BackButton'
import { MapPinOff } from 'lucide-react'
import { Alert, Button, EmptyState, PageHeader, Skeleton } from '@/src/components/ui/capi'

interface DestinationData {
  id: string
  title: string
  description: string
  state: string
  photos: string[]
  highlights: string[]
  heroImageUrl: string | null
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
          highlights: values.highlights.filter(Boolean),
          heroImageUrl: values.heroImageUrl ?? null,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erro ao atualizar destino' }))
        toast.error(err.message ?? 'Erro ao atualizar destino')
        return
      }

      toast.success('Destino atualizado.')
      router.push(`/${slug}/painel/destinos`)
    } catch {
      toast.error('Não foi possível salvar as alterações. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const backHref = `/${slug}/painel/destinos`

  if (loading) {
    return (
      <div className="capi-container capi-container--text" style={{ paddingInline: 0 }} aria-busy="true">
        <BackButton fallbackHref={backHref} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', margin: 'var(--space-3) 0 var(--space-8)' }}>
          <Skeleton width={96} height={12} />
          <Skeleton width="60%" height={28} />
          <Skeleton width="80%" height={16} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <Skeleton width={120} height={14} />
              <Skeleton height={48} radius={12} />
            </div>
          ))}
          <Skeleton height={120} radius={12} />
        </div>
      </div>
    )
  }

  if (loadError || !destination) {
    return (
      <div className="capi-container capi-container--text" style={{ paddingInline: 0 }}>
        <BackButton fallbackHref={backHref} />
        <EmptyState
          icon={MapPinOff}
          title="Destino não encontrado"
          description="Ele pode ter sido excluído ou você não tem acesso a ele."
          action={
            <Button variant="secondary" href={backHref}>
              Ver meus destinos
            </Button>
          }
        />
      </div>
    )
  }

  const status = destination.approvalStatus
  const statusAlert =
    status === 'APPROVED'
      ? { tone: 'success' as const, text: 'Este destino está aprovado e visível no marketplace.' }
      : status === 'REJECTED'
      ? { tone: 'danger' as const, text: 'Este destino foi rejeitado. Edite as informações e salve para enviar a uma nova revisão.' }
      : { tone: 'warning' as const, text: 'Este destino está aguardando aprovação.' }

  return (
    <div className="capi-container capi-container--text" style={{ paddingInline: 0 }}>
      <BackButton fallbackHref={backHref} />

      <PageHeader
        eyebrow="Destinos"
        title="Editar destino"
        description={destination.title}
        actions={<DestinationStatusBadge status={status} />}
      />

      <Alert tone={statusAlert.tone} className="mb-8">
        {statusAlert.text}
      </Alert>

      <DestinationForm
        slug={slug}
        initialValues={{
          name: destination.title,
          description: destination.description,
          state: destination.state,
          photos: destination.photos,
          highlights: destination.highlights,
          heroImageUrl: destination.heroImageUrl,
        }}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Salvar alterações"
        onCancel={() => router.push(backHref)}
      />
    </div>
  )
}
