'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PhotoUploadArea } from '@/src/components/ui/PhotoUploadArea'
import BackButton from '@/src/components/ui/BackButton'

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

const DIFFICULTY: Record<string, { label: string; bg: string; color: string }> = {
  EASY: { label: 'Fácil', bg: '#F0FDF4', color: '#15803D' },
  MODERATE: { label: 'Moderado', bg: '#FEF9EC', color: '#B45309' },
  HARD: { label: 'Difícil', bg: '#FEF2F2', color: '#DC2626' },
  EXTREME: { label: 'Extremo', bg: '#FEF2F2', color: '#7F1D1D' },
}

function formatPrice(price: string | number) {
  const n = typeof price === 'string' ? parseFloat(price) : price
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  fontSize: '16px',
  padding: '8px 12px',
  borderRadius: '4px',
  border: '1px solid var(--stone-300, #d6d3d1)',
  background: '#fff',
  color: 'var(--stone-900, #1c1917)',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
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
      <p style={{ textAlign: 'center', padding: '48px 24px', fontSize: '16px', color: 'var(--stone-500)' }}>
        Carregando roteiro...
      </p>
    )
  }

  if (loadError || !pkg) {
    return (
      <p style={{ textAlign: 'center', padding: '48px 24px', fontSize: '16px', color: 'var(--stone-500)' }}>
        Roteiro não encontrado.
      </p>
    )
  }

  const diff = DIFFICULTY[pkg.difficulty] ?? DIFFICULTY.MODERATE

  return (
    <>
      <style precedence="default">{`
        .roteiro-detail-section {
          background: white;
          border: 1px solid var(--stone-200, #e7e5e4);
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .roteiro-detail-section h2 {
          font-family: var(--font-display, Georgia, serif);
          font-size: 18px;
          color: var(--stone-900, #1c1917);
          margin: 0 0 16px;
        }
        .roteiro-detail-section h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--stone-700, #44403c);
          margin: 0 0 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .highlight-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .highlight-remove-btn {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          min-height: 44px;
          min-width: 44px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--stone-400, #a8a29e);
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }
        .highlight-remove-btn:hover {
          color: #DC2626;
          background: #FEF2F2;
        }
      `}</style>

      <BackButton />

      {/* Page header */}
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
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              color: 'var(--stone-900)',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {pkg.name}
          </h1>
          <span
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              background: diff.bg,
              color: diff.color,
              whiteSpace: 'nowrap',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              alignSelf: 'center',
            }}
          >
            {diff.label}
          </span>
        </div>
      </div>

      {/* Info card */}
      <div className="roteiro-detail-section">
        <h2>Informações do roteiro</h2>
        <p style={{ fontSize: '14px', color: 'var(--stone-500)', margin: '0 0 12px', lineHeight: 1.6 }}>
          {pkg.description}
        </p>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--stone-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
              Preço
            </p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--stone-800)', margin: 0 }}>
              {formatPrice(pkg.price)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--stone-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
              Capacidade
            </p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--stone-800)', margin: 0 }}>
              {pkg.capacity} {pkg.capacity === 1 ? 'pessoa' : 'pessoas'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--stone-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
              Status
            </p>
            <p
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: pkg.active ? '#15803D' : 'var(--stone-400)',
                margin: 0,
              }}
            >
              {pkg.active ? 'Ativo' : 'Inativo'}
            </p>
          </div>
        </div>
      </div>

      {/* Enrichment section */}
      <div className="roteiro-detail-section">
        <h2>Enriquecer roteiro</h2>

        {/* Photos */}
        <div style={{ marginBottom: '32px' }}>
          <h3>Fotos do roteiro</h3>
          <PhotoUploadArea
            photos={photos}
            onAdd={handleAddPhoto}
            onRemove={handleRemovePhoto}
            maxPhotos={5}
          />
        </div>

        {/* Highlights */}
        <div>
          <h3>Experiências incluídas</h3>
          {highlights.length === 0 && (
            <p style={{ fontSize: '14px', color: 'var(--stone-400)', marginBottom: '16px' }}>
              Nenhuma experiência adicionada. Descreva o que o turista irá vivenciar.
            </p>
          )}
          {highlights.map((h, idx) => (
            <div key={idx} className="highlight-row">
              <input
                type="text"
                value={h}
                onChange={(e) => handleHighlightChange(idx, e.target.value)}
                placeholder={`Experiência ${idx + 1} (ex: Trilha até a Pedra Furada)`}
                maxLength={200}
                style={{ ...INPUT_STYLE, flex: 1 }}
              />
              <button
                type="button"
                className="highlight-remove-btn"
                onClick={() => handleRemoveHighlight(idx)}
                aria-label="Remover experiência"
              >
                ×
              </button>
            </div>
          ))}

          {highlights.length < 10 && (
            <button
              type="button"
              onClick={handleAddHighlight}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ochre, #c2783c)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '8px 0',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              + Adicionar experiência
            </button>
          )}
          {highlights.length >= 10 && (
            <p style={{ fontSize: '12px', color: 'var(--stone-400)', marginTop: '8px' }}>
              Máximo de 10 experiências atingido.
            </p>
          )}
        </div>

        {/* Save */}
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--stone-200)' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%',
              minHeight: '44px',
              padding: '12px',
              background: 'var(--ochre, #c2783c)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.65 : 1,
              letterSpacing: '0.04em',
            }}
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </>
  )
}
