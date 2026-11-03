'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PainelDestinationCard, PainelDestination } from '@/src/components/ui/PainelDestinationCard'
import BackButton from '@/src/components/ui/BackButton'
import { MapPinned, Plus, RotateCw, Trash2 } from 'lucide-react'
import { Alert, Button, EmptyState, Modal, PageHeader, Skeleton } from '@/src/components/ui/capi'

export default function DestinosPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()

  const [destinations, setDestinations] = useState<PainelDestination[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
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
        setCurrentUserRole((session?.user as any)?.role ?? '')
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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg = body?.message ?? ''
        if (res.status === 400 && msg.includes('aprovado')) {
          toast.error('Não é possível excluir um destino já aprovado. Entre em contato com o suporte.')
        } else {
          throw new Error(`HTTP ${res.status}`)
        }
        return
      }
      toast.success('Destino excluído.')
      setDeleteConfirm(null)
      await fetchDestinations()
    } catch {
      toast.error('Não foi possível excluir o destino. Tente novamente.')
    } finally {
      setDeleting(false)
    }
  }, [deleteConfirm, slug, fetchDestinations])

  const closeDelete = useCallback(() => {
    if (!deleting) setDeleteConfirm(null)
  }, [deleting])

  const deleteTarget = deleteConfirm ? destinations.find((d) => d.id === deleteConfirm) : undefined

  return (
    <>
      <style precedence="default">{`
        .destinos-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-4);
        }
        @media (min-width: 640px) {
          .destinos-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (min-width: 1024px) {
          .destinos-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-5); }
        }
        .destinos-skel {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          padding-bottom: var(--space-4);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--surface);
          overflow: hidden;
        }
        .destinos-skel__body { display: flex; flex-direction: column; gap: var(--space-2); padding: 0 var(--space-4); }
      `}</style>

      <BackButton fallbackHref={`/${slug}/painel`} />

      <PageHeader
        eyebrow="Painel do guia"
        title="Destinos"
        description="Locais que você cadastrou. Cada novo destino passa por aprovação antes de aparecer no marketplace."
        actions={
          <Button href={`/${slug}/painel/destinos/novo`} iconLeft={Plus}>
            Novo destino
          </Button>
        }
      />

      {loading ? (
        <div className="destinos-grid" aria-busy="true" aria-label="Carregando destinos">
          {[0, 1, 2].map((i) => (
            <div key={i} className="destinos-skel">
              <span className="capi-skel" aria-hidden="true" style={{ aspectRatio: '16 / 9', borderRadius: 0 }} />
              <div className="destinos-skel__body">
                <Skeleton width="70%" height={18} />
                <Skeleton width="30%" height={14} />
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  <Skeleton width={88} height={36} />
                  <Skeleton width={88} height={36} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <Alert
          tone="danger"
          title="Não foi possível carregar seus destinos"
          action={
            <Button variant="secondary" size="sm" iconLeft={RotateCw} onClick={() => fetchDestinations()}>
              Tentar novamente
            </Button>
          }
        >
          Verifique sua conexão e tente de novo.
        </Alert>
      ) : destinations.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="Nenhum destino ainda"
          description="Cadastre seu primeiro destino para aparecer no marketplace."
          action={
            <Button href={`/${slug}/painel/destinos/novo`} iconLeft={Plus}>
              Novo destino
            </Button>
          }
        />
      ) : (
        <div className="destinos-grid">
          {destinations.map((dest) => (
            <PainelDestinationCard
              key={dest.id}
              destination={dest}
              isOwner={currentUserRole === 'ADMIN' || (!!currentUserId && dest.createdById === currentUserId)}
              showStatus
              onEdit={handleEdit}
              onDelete={(id) => setDeleteConfirm(id)}
            />
          ))}
        </div>
      )}

      <Modal
        open={!!deleteConfirm}
        onClose={closeDelete}
        title="Excluir destino?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” será removido da sua lista. Esta ação não pode ser desfeita.`
            : 'Este destino será removido da sua lista. Esta ação não pode ser desfeita.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeDelete} disabled={deleting}>
              Manter destino
            </Button>
            <Button variant="danger" iconLeft={Trash2} onClick={handleDelete} loading={deleting}>
              {deleting ? 'Excluindo…' : 'Sim, excluir'}
            </Button>
          </>
        }
      />
    </>
  )
}
