'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '@/src/components/ui/capi'
import { PackageEditor, type EditablePackage } from '@/src/components/edit-mode/PackageEditor'

function statusLabel(status: EditablePackage['status']) {
  if (status === 'DRAFT') return { tone: 'warning' as const, text: 'Rascunho' }
  if (status === 'HIDDEN') return { tone: 'neutral' as const, text: 'Oculto' }
  return { tone: 'success' as const, text: 'Publicado' }
}

export default function RoteiroDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>()

  const [pkg, setPkg] = useState<EditablePackage | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [destinationSlug, setDestinationSlug] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/proxy?path=${encodeURIComponent(`/tenants/${slug}/manage/packages`)}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const found: EditablePackage | undefined = (data.packages ?? []).find((p: EditablePackage) => p.id === id)
      if (!found) throw new Error('not found')
      setPkg(found)
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [slug, id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial; load() só altera estado após o await
    void load()
  }, [load])

  useEffect(() => {
    fetch(`/api/tenants/${slug}/destination`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDestinationSlug(typeof d?.slug === 'string' ? d.slug : null))
      .catch(() => setDestinationSlug(null))
  }, [slug])

  if (loading) {
    return (
      <div className="capi-container capi-container--text" style={{ paddingInline: 0 }} aria-busy="true">
        <span className="sr-only-capi">Carregando roteiro...</span>
        <div className="mb-6 flex flex-col gap-3">
          <Skeleton width={90} height={14} />
          <Skeleton width="70%" height={30} />
          <Skeleton width={140} height={22} radius={999} />
        </div>
        <Skeleton lines={4} />
      </div>
    )
  }

  if (loadError || !pkg) {
    return (
      <EmptyState
        title="Roteiro não encontrado."
        description="Ele pode ter sido removido ou o link está incorreto."
        action={
          <Button href={`/${slug}/painel/roteiros`} variant="secondary">
            Voltar para roteiros
          </Button>
        }
      />
    )
  }

  const status = statusLabel(pkg.status)

  return (
    <div className="capi-container capi-container--text" style={{ paddingInline: 0 }}>
      <PageHeader
        backHref={`/${slug}/painel/roteiros`}
        backLabel="Roteiros"
        eyebrow="Roteiro"
        title={pkg.name}
        actions={
          pkg.status === 'PUBLISHED' || (pkg.status === 'DRAFT' && destinationSlug) ? (
            <Button
              href={pkg.status === 'PUBLISHED' ? `/${slug}/roteiros/${pkg.id}?editar=1` : `/destinos/${destinationSlug}/roteiros?editar=1`} variant="secondary" iconLeft={ExternalLink}>
              Ver e editar no site
            </Button>
          ) : undefined
        }
      />
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge kind="difficulty" status={pkg.difficulty} />
        <Badge tone={status.tone} dot>{status.text}</Badge>
      </div>

      <PackageEditor
        tenantSlug={slug}
        pkg={pkg}
        open
        inline
        onClose={() => {}}
        onSaved={() => { void load() }}
      />
    </div>
  )
}
