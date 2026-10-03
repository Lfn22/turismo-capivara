'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PhotoUploadArea } from '@/src/components/ui/PhotoUploadArea'
import { Check, Plus, X } from 'lucide-react'
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '@/src/components/ui/capi'
import PainelCard from '@/src/components/painel/PainelCard'

interface PackageData {
  id: string
  name: string
  description: string
  price: string | number
  difficulty: 'EASY' | 'MODERATE' | 'HARD' | 'EXTREME'
  active: boolean
  capacity: number
  photos: string[]
  highlights: string[]
  conductorId?: string
}

function DifficultyBadge({ difficulty }: { difficulty: PackageData['difficulty'] }) {
  if (difficulty === 'EXTREME') return <Badge tone="danger">Extremo</Badge>
  return <StatusBadge kind="difficulty" status={difficulty ?? 'MODERATE'} />
}

function formatPrice(price: string | number) {
  const n = typeof price === 'string' ? parseFloat(price) : price
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function RoteiroDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>()
  const router = useRouter()

  const [pkg, setPkg] = useState<PackageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // Enrichment state
  const [photos, setPhotos] = useState<string[]>([])
  const [highlights, setHighlights] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/tenants/${slug}/packages/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: PackageData) => {
        setPkg(data)
        setPhotos(data.photos ?? [])
        setHighlights(data.highlights ?? [])
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [slug, id])

  const handleAddPhoto = useCallback(
    async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/uploads/photos?folder=packages`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erro no upload' }))
        throw new Error(err.message ?? 'Erro no upload')
      }
      const { url } = await res.json()
      setPhotos((prev) => [...prev, url])
    },
    [],
  )

  const handleRemovePhoto = useCallback((url: string) => {
    setPhotos((prev) => prev.filter((p) => p !== url))
  }, [])

  const handleAddHighlight = useCallback(() => {
    if (highlights.length >= 10) {
      toast.error('Máximo de 10 experiências permitidas.')
      return
    }
    setHighlights((prev) => [...prev, ''])
  }, [highlights.length])

  const handleHighlightChange = useCallback((idx: number, value: string) => {
    setHighlights((prev) => {
      const next = [...prev]
      next[idx] = value
      return next
    })
  }, [])

  const handleRemoveHighlight = useCallback((idx: number) => {
    setHighlights((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const handleSave = useCallback(async () => {
    // Validate highlights
    for (const h of highlights) {
      if (h.trim().length > 0 && (h.trim().length < 5 || h.trim().length > 200)) {
        toast.error('Cada experiência deve ter entre 5 e 200 caracteres.')
        return
      }
    }
    const validHighlights = highlights.filter((h) => h.trim().length > 0)

    setSaving(true)
    try {
      const res = await fetch(`/api/tenants/${slug}/packages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos, highlights: validHighlights }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erro ao salvar' }))
        toast.error(err.message ?? 'Erro ao salvar alterações')
        return
      }
      toast.success('Roteiro atualizado com sucesso.')
    } catch {
      toast.error('Falha ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }, [slug, id, photos, highlights])

  if (loading) {
    return (
      <div className="capi-container capi-container--text" style={{ paddingInline: 0 }} aria-busy="true">
        <span className="sr-only-capi">Carregando roteiro...</span>
        <div className="mb-6 flex flex-col gap-3">
          <Skeleton width={90} height={14} />
          <Skeleton width="70%" height={30} />
          <Skeleton width={140} height={22} radius={999} />
        </div>
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <PainelCard key={i}>
              <Skeleton width="40%" height={18} />
              <div className="mt-4">
                <Skeleton lines={3} />
              </div>
            </PainelCard>
          ))}
        </div>
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

  return (
    <div className="capi-container capi-container--text" style={{ paddingInline: 0 }}>
      <style>{`
        .roteiro-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--space-4); margin: var(--space-4) 0 0; padding-top: var(--space-4); border-top: 1px solid var(--border); }
        .roteiro-facts dt { margin: 0 0 4px; font-size: 13px; font-weight: 500; color: var(--text-secondary); }
        .roteiro-facts dd { margin: 0; font-size: 16px; font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
        .highlight-row { display: flex; align-items: flex-end; gap: var(--space-2); }
        .highlight-row > :first-child { flex: 1; min-width: 0; }
        /* Ação de salvar fixa no rodapé do celular, acima da bottom nav */
        .painel-form-actions {
          position: sticky; z-index: var(--z-sticky);
          bottom: calc(var(--bottombar-height) + env(safe-area-inset-bottom, 0px));
          display: flex; flex-direction: column; gap: var(--space-2);
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
        eyebrow="Roteiro"
        title={pkg.name}
      />
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={pkg.difficulty} />
        <Badge tone={pkg.active ? 'success' : 'neutral'} dot>
          {pkg.active ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      <div className="flex flex-col gap-4">
        {/* Info card */}
        <PainelCard title="Informações do roteiro">
          <p className="text-fg-secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>
            {pkg.description}
          </p>
          <dl className="roteiro-facts">
            <div>
              <dt>Preço por pessoa</dt>
              <dd>{formatPrice(pkg.price)}</dd>
            </div>
            <div>
              <dt>Capacidade</dt>
              <dd>
                {pkg.capacity} {pkg.capacity === 1 ? 'pessoa' : 'pessoas'}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{pkg.active ? 'Ativo' : 'Inativo'}</dd>
            </div>
          </dl>
        </PainelCard>

        {/* Photos */}
        <PainelCard title="Fotos do roteiro">
          <p className="mb-4 text-fg-secondary" style={{ fontSize: 14 }}>
            Até 5 fotos, em JPEG, PNG ou WebP.
          </p>
          <PhotoUploadArea
            photos={photos}
            onAdd={handleAddPhoto}
            onRemove={handleRemovePhoto}
            maxPhotos={5}
          />
        </PainelCard>

        {/* Highlights */}
        <PainelCard title="Experiências incluídas">
          {highlights.length === 0 && (
            <p className="mb-4 text-fg-secondary" style={{ fontSize: 14 }}>
              Nenhuma experiência adicionada. Descreva o que o turista irá vivenciar.
            </p>
          )}
          <div className="flex flex-col gap-3">
            {highlights.map((h, idx) => (
              <div key={idx} className="highlight-row">
                <Input
                  label={`Experiência ${idx + 1}`}
                  hideLabel
                  value={h}
                  onChange={(e) => handleHighlightChange(idx, e.target.value)}
                  placeholder={`Experiência ${idx + 1} (ex: Trilha até a Pedra Furada)`}
                  maxLength={200}
                />
                <IconButton
                  icon={X}
                  label="Remover experiência"
                  onClick={() => handleRemoveHighlight(idx)}
                />
              </div>
            ))}
          </div>

          {highlights.length < 10 && (
            <div className="mt-3">
              <Button variant="ghost" iconLeft={Plus} onClick={handleAddHighlight}>
                Adicionar experiência
              </Button>
            </div>
          )}
          {highlights.length >= 10 && (
            <p className="mt-3 text-fg-tertiary" style={{ fontSize: 13 }}>
              Máximo de 10 experiências atingido.
            </p>
          )}
        </PainelCard>
      </div>

      {/* Save */}
      <div className="painel-form-actions">
        <Button iconLeft={Check} onClick={handleSave} loading={saving} fullWidth>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </div>
  )
}
