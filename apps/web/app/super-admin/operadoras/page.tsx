"use client"
import { useState, useEffect, useCallback, type ReactNode } from "react"
import { Building2, Check, Eye, Link2, RotateCw, X } from "lucide-react"
import {
  Alert,
  Avatar,
  Button,
  EmptyState,
  ListGroup,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  StatusBadge,
  Textarea,
} from "@/src/components/ui/capi"

interface Tenant {
  id: string
  name: string
  slug: string
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED"
  rejectionReason: string | null
  createdAt: string
  users: Array<{ email: string; name: string }>
  destinationId: string | null
}

interface DestinationOption {
  id: string
  title: string
  slug: string
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR")
}

/** Linha da fila de moderação: avatar, dados e ações; ações descem para a linha de baixo no mobile. */
function QueueRow({
  lead,
  title,
  subtitle,
  meta,
  note,
  status,
  actions,
  busy,
}: {
  lead: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  note?: ReactNode
  status: ReactNode
  actions?: ReactNode
  busy?: boolean
}) {
  return (
    <div
      className="capi-row flex-wrap lg:flex-nowrap"
      style={{ opacity: busy ? 0.6 : 1, transition: "opacity .15s ease" }}
      aria-busy={busy || undefined}
    >
      <div className="capi-row__lead">{lead}</div>
      <div className="capi-row__main">
        <p className="capi-row__title">{title}</p>
        {subtitle ? <p className="capi-row__sub">{subtitle}</p> : null}
        {meta ? <p className="capi-row__sub">{meta}</p> : null}
        {note ? <p className="mt-1 text-[13px] text-danger">{note}</p> : null}
      </div>
      <div className="flex w-full flex-wrap items-center justify-between gap-2 lg:w-auto lg:flex-nowrap lg:justify-end">
        {status}
        {actions ? <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-fg-secondary">{label}</dt>
      <dd className="m-0 text-[15px] font-medium text-fg break-words">{children}</dd>
    </div>
  )
}

export default function SuperAdminOperadorasPage() {
  const [items, setItems] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Tenant | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [rejectSubmitting, setRejectSubmitting] = useState(false)
  const [destinations, setDestinations] = useState<DestinationOption[]>([])
  const [linkTarget, setLinkTarget] = useState<Tenant | null>(null)
  const [linkDestinationId, setLinkDestinationId] = useState<string>("")
  const [linkSubmitting, setLinkSubmitting] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  // Só apresentação: operadora aberta no painel "Revisar" (usa os dados já carregados)
  const [reviewTarget, setReviewTarget] = useState<Tenant | null>(null)
  // onClose estável: o Modal capi refoca o painel quando onClose muda
  const closeReview = useCallback(() => setReviewTarget(null), [])
  const closeReject = useCallback(() => setRejectTarget(null), [])
  const closeLink = useCallback(() => setLinkTarget(null), [])

  function loadTenants() {
    setLoading(true)
    setLoadError(false)
    setOffset(0)
    setHasMore(true)
    fetch("/api/super-admin/tenants/all?limit=50&offset=0")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.tenants ?? [])
        setItems(list)
        setHasMore(list.length === 20)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  function loadMore() {
    const nextOffset = offset + 20
    setLoadingMore(true)
    fetch(`/api/super-admin/tenants/all?limit=50&offset=${nextOffset}`)
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.tenants ?? [])
        setItems((prev) => [...prev, ...list])
        setOffset(nextOffset)
        setHasMore(list.length === 20)
      })
      .catch(() => { /* silencioso — botão permanece */ })
      .finally(() => setLoadingMore(false))
  }

  useEffect(() => {
    loadTenants()
    fetch("/api/admin/destinations?status=APPROVED&limit=100&offset=0")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.destinations ?? [])
        setDestinations(list)
      })
      .catch(() => { /* silencioso */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLinkDestination() {
    if (!linkTarget) return
    setLinkSubmitting(true)
    setLinkError(null)
    try {
      const res = await fetch(`/api/super-admin/tenants/${linkTarget.id}/link-destination`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationId: linkDestinationId || null }),
      })
      if (!res.ok) throw new Error()
      setItems((prev) =>
        prev.map((t) => t.id === linkTarget.id ? { ...t, destinationId: linkDestinationId || null } : t)
      )
      setLinkTarget(null)
    } catch {
      setLinkError("Não foi possível vincular o destino. Tente novamente.")
    } finally {
      setLinkSubmitting(false)
    }
  }

  async function handleApprove(tenant: Tenant) {
    setActionLoading(tenant.id)
    setActionError(null)
    // Optimistic update — approvalStatus set to APPROVED immediately
    setItems((prev) =>
      prev.map((t) => (t.id === tenant.id ? { ...t, approvalStatus: "APPROVED" } : t))
    )
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenant.id}/approve`, {
        method: "PATCH",
      })
      if (!res.ok) throw new Error()
    } catch {
      // Rollback optimistic update
      setItems((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, approvalStatus: "PENDING" } : t))
      )
      setActionError("Não foi possível realizar a ação. Tente novamente.")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRejectSubmit() {
    if (!rejectTarget || !rejectReason.trim()) {
      setRejectError("Informe o motivo da rejeição.")
      return
    }
    setRejectSubmitting(true)
    setRejectError(null)
    try {
      const res = await fetch(`/api/super-admin/tenants/${rejectTarget.id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      })
      if (!res.ok) throw new Error()
      setItems((prev) =>
        prev.map((t) =>
          t.id === rejectTarget.id
            ? { ...t, approvalStatus: "REJECTED", rejectionReason: rejectReason }
            : t
        )
      )
      setRejectTarget(null)
      setRejectReason("")
    } catch {
      setRejectError("Não foi possível rejeitar a operadora. Tente novamente.")
    } finally {
      setRejectSubmitting(false)
    }
  }

  function openReject(tenant: Tenant) {
    setRejectTarget(tenant)
    setRejectReason("")
    setRejectError(null)
  }

  function openLink(tenant: Tenant) {
    setLinkTarget(tenant)
    setLinkDestinationId(tenant.destinationId ?? "")
    setLinkError(null)
  }

  function destinationTitle(id: string | null) {
    if (!id) return null
    return destinations.find((d) => d.id === id)?.title ?? null
  }

  const pendingCount = items.filter((t) => t.approvalStatus === "PENDING").length

  return (
    <>
      <PageHeader
        eyebrow="Moderação"
        title="Operadoras"
        description={
          pendingCount === 1
            ? "1 operadora aguardando aprovação."
            : `${pendingCount} operadoras aguardando aprovação.`
        }
      />

      {actionError ? (
        <Alert tone="danger" className="mb-4">
          {actionError}
        </Alert>
      ) : null}

      {loading ? (
        <ListGroup>
          {[1, 2, 3].map((i) => (
            <div key={i} className="capi-row" aria-hidden="true">
              <Skeleton width={48} height={48} radius={24} />
              <div className="capi-row__main flex flex-col gap-2">
                <Skeleton width="45%" height={14} />
                <Skeleton width="30%" height={12} />
              </div>
            </div>
          ))}
        </ListGroup>
      ) : loadError ? (
        <Alert
          tone="danger"
          title="Erro ao carregar operadoras."
          action={
            <Button variant="secondary" size="sm" iconLeft={RotateCw} onClick={loadTenants}>
              Tentar novamente
            </Button>
          }
        >
          Verifique sua conexão e tente de novo.
        </Alert>
      ) : items.length === 0 ? (
        <ListGroup>
          <EmptyState
            icon={Building2}
            title="Nenhuma operadora cadastrada ainda."
            description="Quando uma operadora se cadastrar, ela aparece aqui para aprovação."
          />
        </ListGroup>
      ) : (
        <div>
          <ListGroup>
            {items.map((item) => {
              const busy = actionLoading === item.id
              const email = item.users[0]?.email ?? "—"
              const linked = destinationTitle(item.destinationId)
              return (
                <QueueRow
                  key={item.id}
                  busy={busy}
                  lead={<Avatar name={item.name} size={48} />}
                  title={item.name}
                  subtitle={`${item.slug} · ${email}`}
                  meta={
                    item.approvalStatus === "APPROVED" && item.destinationId
                      ? `Cadastrada em ${formatDate(item.createdAt)} · Destino: ${linked ?? "vinculado"}`
                      : `Cadastrada em ${formatDate(item.createdAt)}`
                  }
                  note={
                    item.approvalStatus === "REJECTED" && item.rejectionReason
                      ? `Motivo: ${item.rejectionReason}`
                      : null
                  }
                  status={<StatusBadge kind="approval" status={item.approvalStatus} />}
                  actions={
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconLeft={Eye}
                        onClick={() => setReviewTarget(item)}
                        aria-label={`Revisar operadora ${item.name}`}
                      >
                        Revisar
                      </Button>
                      {item.approvalStatus === "PENDING" ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openReject(item)}
                            disabled={busy}
                            aria-label={`Rejeitar operadora ${item.name}`}
                          >
                            Rejeitar
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            iconLeft={Check}
                            onClick={() => handleApprove(item)}
                            loading={busy}
                            aria-label={`Aprovar operadora ${item.name}`}
                          >
                            Aprovar
                          </Button>
                        </>
                      ) : item.approvalStatus === "APPROVED" ? (
                        <Button variant="secondary" size="sm" iconLeft={Link2} onClick={() => openLink(item)}>
                          {item.destinationId ? "Alterar destino" : "Vincular destino"}
                        </Button>
                      ) : null}
                    </>
                  }
                />
              )
            })}
          </ListGroup>
          {hasMore && !loading && !loadError && (
            <div className="flex justify-center py-6">
              <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                {loadingMore ? "Carregando..." : "Carregar mais"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Revisar: detalhes da operadora já carregada */}
      <Modal
        open={!!reviewTarget}
        onClose={closeReview}
        title={reviewTarget?.name ?? "Operadora"}
        description={reviewTarget?.slug}
        footer={
          reviewTarget?.approvalStatus === "PENDING" ? (
            <>
              <Button
                variant="secondary"
                iconLeft={X}
                onClick={() => {
                  const target = reviewTarget
                  setReviewTarget(null)
                  if (target) openReject(target)
                }}
              >
                Rejeitar
              </Button>
              <Button
                variant="primary"
                iconLeft={Check}
                onClick={() => {
                  const target = reviewTarget
                  setReviewTarget(null)
                  if (target) handleApprove(target)
                }}
              >
                Aprovar operadora
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={closeReview}>
              Fechar
            </Button>
          )
        }
      >
        {reviewTarget ? (
          <div className="flex flex-col gap-5">
            <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailItem label="Status">
                <StatusBadge kind="approval" status={reviewTarget.approvalStatus} />
              </DetailItem>
              <DetailItem label="Cadastrada em">{formatDate(reviewTarget.createdAt)}</DetailItem>
              <DetailItem label="Responsável">{reviewTarget.users[0]?.name ?? "—"}</DetailItem>
              <DetailItem label="E-mail">{reviewTarget.users[0]?.email ?? "—"}</DetailItem>
              <DetailItem label="Endereço (slug)">{reviewTarget.slug}</DetailItem>
              <DetailItem label="Destino vinculado">
                {reviewTarget.destinationId ? destinationTitle(reviewTarget.destinationId) ?? "Vinculado" : "Nenhum"}
              </DetailItem>
            </dl>
            {reviewTarget.approvalStatus === "REJECTED" && reviewTarget.rejectionReason ? (
              <Alert tone="danger" title="Motivo da rejeição">
                {reviewTarget.rejectionReason}
              </Alert>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Vincular destino */}
      <Modal
        open={!!linkTarget}
        onClose={closeLink}
        title="Vincular destino"
        description={linkTarget ? `Escolha o destino da operadora ${linkTarget.name}.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={closeLink}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleLinkDestination} loading={linkSubmitting}>
              {linkSubmitting ? "Salvando..." : "Salvar destino"}
            </Button>
          </>
        }
      >
        <Select
          label="Destino"
          value={linkDestinationId}
          onChange={(e) => setLinkDestinationId(e.target.value)}
          error={linkError}
          hint="Só aparecem destinos aprovados."
        >
          <option value="">Sem destino vinculado</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>{d.title}</option>
          ))}
        </Select>
      </Modal>

      {/* Rejeição com motivo obrigatório */}
      <Modal
        open={!!rejectTarget}
        onClose={closeReject}
        title="Rejeitar operadora"
        description="Informe o motivo da rejeição. A operadora receberá este motivo por e-mail."
        footer={
          <>
            <Button variant="secondary" onClick={closeReject}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleRejectSubmit} loading={rejectSubmitting}>
              {rejectSubmitting ? "Rejeitando..." : "Rejeitar operadora"}
            </Button>
          </>
        }
      >
        <Textarea
          label="Motivo da rejeição"
          rows={4}
          placeholder="Ex.: o CNPJ informado não corresponde à razão social."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          error={rejectError}
          autoFocus
        />
      </Modal>
    </>
  )
}
