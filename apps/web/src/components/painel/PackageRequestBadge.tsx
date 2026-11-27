'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button } from '@/src/components/ui/capi'
import { callProxy } from '@/src/components/membership/membership-shared'

export type PackageRequestSummary = {
  id: string
  type: 'PUBLISH' | 'UPDATE' | 'UNPUBLISH' | 'ARCHIVE'
  status: 'PENDING' | 'REJECTED'
  rejectionReason: string | null
}

const PENDING_LABEL: Record<PackageRequestSummary['type'], string> = {
  PUBLISH: 'Aguardando aprovação',
  UPDATE: 'Alteração pendente',
  UNPUBLISH: 'Despublicação pendente',
  ARCHIVE: 'Arquivamento pendente',
}

/** Selo do pedido de aprovação de um roteiro; o guia pode cancelar enquanto estiver pendente. */
export default function PackageRequestBadge({
  slug,
  packageId,
  request,
  isGuide,
}: {
  slug: string
  packageId: string
  request: PackageRequestSummary | null
  /** Só o guia (autor do pedido) pode cancelar */
  isGuide: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!request) return null

  if (request.status === 'REJECTED') {
    return (
      <Badge tone="danger">
        {request.rejectionReason ? `Recusado — ${request.rejectionReason}` : 'Recusado'}
      </Badge>
    )
  }

  async function cancel() {
    if (!window.confirm('Cancelar este pedido?')) return
    setBusy(true)
    setError(null)
    try {
      const { res, data } = await callProxy(
        `/tenants/${slug}/packages/${packageId}/request`,
        'DELETE',
      )
      if (!res.ok) {
        setError(data?.message ?? 'Não foi possível cancelar o pedido.')
        return
      }
      router.refresh()
    } catch {
      setError('Falha de conexão. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="warning" dot>
        {PENDING_LABEL[request.type]}
      </Badge>
      {isGuide ? (
        <Button variant="secondary" size="sm" onClick={cancel} disabled={busy}>
          Cancelar pedido
        </Button>
      ) : null}
      {error ? (
        <span role="alert" style={{ fontSize: 13, color: 'var(--danger)' }}>
          {error}
        </span>
      ) : null}
    </div>
  )
}
