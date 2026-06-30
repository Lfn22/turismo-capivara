'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PainelDestinationCard, PainelDestination } from '@/src/components/ui/PainelDestinationCard'
import EmptyState from '@/src/components/ui/EmptyState'
import BackButton from '@/src/components/ui/BackButton'

export default function DestinosPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()

  const [destinations, setDestinations] = useState<PainelDestination[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchDestinations = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [sessionRes, destRes] = await Promise.all([
        fetch('/api/auth/session'),
        fetch(`/api/tenants/${slug}/destinations`),
      ])
      if (sessionRes.ok) {
        const session = await sessionRes.json()
        setCurrentUserId((session?.user as any)?.id ?? '')
      }
      if (!destRes.ok) throw new Error(`HTTP ${destRes.status}`)
      const data = await destRes.json()
      setDestinations(Array.isArray(data.destinations) ? data.destinations : [])
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchDestinations()
  }, [fetchDestinations])

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/${slug}/painel/destinos/${id}/editar`)
    },
    [router, slug],
  )

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tenants/${slug}/destinations/${deleteConfirm}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Local excluído com sucesso.')
      setDeleteConfirm(null)
      await fetchDestinations()
    } catch {
      toast.error('Falha ao excluir destino. Tente novamente.')
    } finally {
      setDeleting(false)
    }
  }, [deleteConfirm, slug, fetchDestinations])

  return (
    <>
      <style precedence="default">{`
        .destinos-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .destinos-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 640px) {
          .destinos-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .destinos-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .destinos-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 24px;
        }
        .destinos-dialog {
          background: white;
          border-radius: 8px;
          padding: 24px;
          max-width: 400px;
          width: 100%;
        }
        .destinos-dialog h2 {
          font-family: var(--font-display, Georgia, serif);
          font-size: 18px;
          color: var(--stone-900, #1c1917);
          margin: 0 0 12px;
        }
        .destinos-dialog p {
          font-size: 14px;
          color: var(--stone-500, #78716c);
          margin: 0 0 24px;
        }
        .destinos-dialog-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
      `}</style>

      <BackButton />

      <div className="destinos-header">
        <div>
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
            Locais
          </h1>
        </div>

        <a
          href={`/${slug}/painel/destinos/novo`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--ochre, #c2783c)',
            color: 'white',
            padding: '8px 20px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            minHeight: '44px',
          }}
        >
          + Criar local
        </a>
      </div>

      {loading ? (
        <p
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            fontSize: '16px',
            color: 'var(--stone-500)',
          }}
        >
          Carregando locais...
        </p>
      ) : loadError ? (
        <p
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            fontSize: '16px',
            color: 'var(--stone-500)',
          }}
        >
          Erro ao carregar locais. Tente novamente.
        </p>
      ) : destinations.length === 0 ? (
        <EmptyState
          title="Nenhum local ainda"
          description="Crie seu primeiro local para aparecer no marketplace."
          ctaLabel="Criar local"
          ctaHref={`/${slug}/painel/destinos/novo`}
        />
      ) : (
        <div className="destinos-grid">
          {destinations.map((dest) => (
            <PainelDestinationCard
              key={dest.id}
              destination={dest}
              isOwner={!!currentUserId && dest.createdById === currentUserId}
              showStatus
              onEdit={handleEdit}
              onDelete={(id) => setDeleteConfirm(id)}
            />
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div className="destinos-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="destinos-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Excluir local</h2>
            <p>Tem certeza que deseja excluir este local? Esta ação não pode ser desfeita.</p>
            <div className="destinos-dialog-actions">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '8px 20px',
                  border: '1px solid var(--stone-300)',
                  borderRadius: '4px',
                  background: 'transparent',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--stone-700)',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '8px 20px',
                  border: 'none',
                  borderRadius: '4px',
                  background: '#DC2626',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.6 : 1,
                  minHeight: '44px',
                }}
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
