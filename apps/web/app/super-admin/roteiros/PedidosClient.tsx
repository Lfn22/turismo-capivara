'use client'
import { useEffect, useState } from 'react'
import { ClipboardCheck, RotateCw } from 'lucide-react'
import {
  Alert,
  Button,
  EmptyState,
  ListGroup,
  PageHeader,
  Skeleton,
  Textarea,
} from '@/src/components/ui/capi'

type RequestType = 'PUBLISH' | 'UPDATE' | 'UNPUBLISH' | 'ARCHIVE'
type Field = 'name' | 'description' | 'price' | 'extraGuidePrice'
type Value = string | number | null

interface PackageRequest {
  id: string
  type: RequestType
  createdAt: string
  updatedAt: string
  changes: Partial<Record<Field, { from: Value; to: Value }>> | null
  package: {
    id: string
    name: string
    description: string
    price: number
    extraGuidePrice: number | null
    active: boolean
    publishedAt: string | null
    tenantSlug: string
    destinationTitle: string | null
  }
  requestedBy: { id: string; name: string }
}

const TYPE_LABEL: Record<RequestType, string> = {
  PUBLISH: 'Entrada no ar',
  UPDATE: 'Alteração',
  UNPUBLISH: 'Despublicação',
  ARCHIVE: 'Arquivamento',
}

const FIELD_LABEL: Record<Field, string> = {
  name: 'Nome',
  description: 'Descrição',
  price: 'Valor do grupo',
  extraGuidePrice: 'Acréscimo por guia extra',
}

const proxy = (path: string) => `/api/proxy?path=${encodeURIComponent(path)}`

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatValue(field: Field, v: Value) {
  if (field === 'extraGuidePrice' && v === null) return 'sem acréscimo'
  if (typeof v === 'number') return formatBRL(v)
  return v ?? '—'
}

// O roteiro mudou desde o pedido (ex.: a equipe já publicou): avisa para a equipe poder recusar
function staleNote(type: RequestType, pkg: PackageRequest['package']) {
  if (!pkg.active) return 'Roteiro já arquivado'
  if (type === 'PUBLISH') return pkg.publishedAt ? 'Roteiro já publicado' : null
  return pkg.publishedAt ? null : 'Roteiro fora do ar'
}

const REQUEST_CHANGED =
  'O pedido mudou desde que você abriu a revisão. Recarregue a lista e revise de novo.'

async function errorMessage(res: Response, fallback: string) {
  const data = (await res.json().catch(() => null)) as { message?: string } | null
  return data?.message ?? fallback
}

function PedidoCard({
  req,
  onDecided,
  onStale,
}: {
  req: PackageRequest
  onDecided: (id: string) => void
  onStale: () => void
}) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function decide(
    action: 'approve' | 'reject',
    body: { reason: string } | { updatedAt: string },
  ) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(proxy(`/admin/package-requests/${req.id}/${action}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const message = await errorMessage(res, 'Não foi possível concluir. Tente de novo.')
        setError(message)
        // O guia mudou o pedido depois que a lista carregou: traz a versão nova para revisar
        if (res.status === 409 && message === REQUEST_CHANGED) onStale()
        return
      }
      onDecided(req.id)
    } catch {
      setError('Não foi possível concluir. Verifique sua conexão.')
    } finally {
      setBusy(false)
    }
  }

  function confirmReject() {
    const text = reason.trim()
    if (text.length < 5 || text.length > 500) {
      setReasonError('Informe o motivo (de 5 a 500 caracteres).')
      return
    }
    setReasonError(null)
    void decide('reject', { reason: text })
  }

  const pkg = req.package
  const changes = req.changes
    ? (Object.entries(req.changes) as [Field, { from: Value; to: Value }][])
    : []
  const removal = req.type === 'ARCHIVE' || req.type === 'UNPUBLISH'
  const stale = staleNote(req.type, pkg)
  // Rascunho não tem página pública: a equipe confere na lista de roteiros da operadora
  const pkgHref =
    req.type === 'PUBLISH'
      ? `/super-admin/roteiros?operadora=${pkg.tenantSlug}`
      : `/${pkg.tenantSlug}/roteiros/${pkg.id}`

  return (
    <div className="capi-row flex-col gap-3" style={{ alignItems: 'stretch' }}>
      <div>
        <p className="capi-row__sub">{TYPE_LABEL[req.type]}</p>
        <p className="capi-row__title">
          <a href={pkgHref}>{pkg.name}</a>
        </p>
        <p className="capi-row__sub">
          Guia: {req.requestedBy.name}
          {pkg.destinationTitle ? ` · Destino: ${pkg.destinationTitle}` : ''} ·{' '}
          {new Date(req.createdAt).toLocaleDateString('pt-BR')}
        </p>
      </div>

      {stale ? <Alert tone="warning">{stale}</Alert> : null}

      {req.type !== 'UPDATE' ? (
        <div className="flex flex-col gap-1 text-sm">
          <p>{pkg.description}</p>
          <p>
            {FIELD_LABEL.price}: {formatValue('price', pkg.price)}
          </p>
          <p>
            {FIELD_LABEL.extraGuidePrice}: {formatValue('extraGuidePrice', pkg.extraGuidePrice)}
          </p>
        </div>
      ) : null}

      {req.type === 'UPDATE' && changes.length > 0 ? (
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>Campo</th>
              <th>Antes</th>
              <th>Depois</th>
            </tr>
          </thead>
          <tbody>
            {changes.map(([field, { from, to }]) => {
              const current = pkg[field]
              return (
                <tr key={field}>
                  <td>{FIELD_LABEL[field]}</td>
                  <td>
                    {formatValue(field, from)}
                    {current !== from ? (
                      <strong className="block" style={{ color: 'var(--warning, #b45309)' }}>
                        Atual: {formatValue(field, current)}
                      </strong>
                    ) : null}
                  </td>
                  <td>{formatValue(field, to)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : null}

      {removal ? (
        <Alert tone="warning">Ao aprovar, as reservas futuras serão canceladas e estornadas.</Alert>
      ) : null}

      {rejecting ? (
        <div className="flex flex-col gap-2">
          <Textarea
            label="Motivo"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            error={reasonError}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={confirmReject} disabled={busy}>
              Confirmar recusa
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setRejecting(false)
                setReasonError(null)
              }}
              disabled={busy}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => void decide('approve', { updatedAt: req.updatedAt })}
            disabled={busy}
          >
            Aprovar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setRejecting(true)} disabled={busy}>
            Recusar
          </Button>
        </div>
      )}

      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  )
}

export default function PedidosClient() {
  const [requests, setRequests] = useState<PackageRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  function load() {
    fetch(proxy('/admin/package-requests?status=PENDING'))
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json() as Promise<{ requests?: PackageRequest[] }>
      })
      .then((data) => setRequests(data.requests ?? []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  // Só atualiza estado nos callbacks da promise
  useEffect(load, [])

  function retry() {
    setLoadError(false)
    setLoading(true)
    load()
  }

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Pedidos pendentes"
        description="Mudanças de roteiros feitas por guias que aguardam a decisão da equipe."
      />
      {loading ? (
        <ListGroup>
          {[1, 2].map((i) => (
            <div key={i} className="capi-row" aria-hidden="true">
              <div className="capi-row__main flex flex-col gap-2">
                <Skeleton width="50%" height={14} />
                <Skeleton width="30%" height={12} />
              </div>
            </div>
          ))}
        </ListGroup>
      ) : loadError ? (
        <Alert
          tone="danger"
          title="Erro ao carregar pedidos."
          action={
            <Button variant="secondary" size="sm" iconLeft={RotateCw} onClick={retry}>
              Tentar novamente
            </Button>
          }
        >
          Verifique sua conexão e tente de novo.
        </Alert>
      ) : requests.length === 0 ? (
        <ListGroup>
          <EmptyState icon={ClipboardCheck} title="Nenhum pedido pendente." />
        </ListGroup>
      ) : (
        <ListGroup>
          {requests.map((req) => (
            <PedidoCard
              key={req.id}
              req={req}
              onDecided={(id) => setRequests((rs) => rs.filter((r) => r.id !== id))}
              onStale={load}
            />
          ))}
        </ListGroup>
      )}
    </>
  )
}
