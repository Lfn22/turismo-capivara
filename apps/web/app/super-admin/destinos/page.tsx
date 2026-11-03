"use client"
import { useState, useEffect, useCallback, type ReactNode } from "react"
import { toast } from "sonner"
import { Check, Eye, Map as MapIcon, RotateCw, X } from "lucide-react"
import {
  Alert,
  Button,
  EmptyState,
  ListGroup,
  Media,
  Modal,
  PageHeader,
  Skeleton,
  StatusBadge,
  Tabs,
  Textarea,
} from "@/src/components/ui/capi"

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED"

interface Destination {
  id: string
  slug: string
  title: string
  state: string
  heroImageUrl: string | null
  approvalStatus: ApprovalStatus
  rejectionReason: string | null
  createdBy: { name: string; email: string; tenant: { slug: string; name: string } } | null
  createdAt: string
}

type Tab = "TODOS" | ApprovalStatus

const TABS: { value: Tab; label: string }[] = [
  { value: "TODOS", label: "Todos" },
  { value: "PENDING", label: "Em análise" },
  { value: "APPROVED", label: "Aprovados" },
  { value: "REJECTED", label: "Rejeitados" },
]

function formatDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR")
}

function operatorName(dest: Destination) {
  return dest.createdBy?.tenant?.name || dest.createdBy?.tenant?.slug || "—"
}

/** Linha da fila de moderação: thumbnail, dados e ações; ações descem para a linha de baixo no mobile. */
function QueueRow({
  thumb,
  title,
  subtitle,
  meta,
  note,
  status,
  actions,
  busy,
}: {
  thumb: ReactNode
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
      <div className="capi-row__lead">{thumb}</div>
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

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div style={{ width: 72, flex: "none" }}>
      <Media src={src} alt={alt} ratio="1 / 1" sizes="72px" placeholder="mountain" />
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

export default function SuperAdminDestinosPage() {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("TODOS")
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Destination | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [rejectSubmitting, setRejectSubmitting] = useState(false)
  // Só apresentação: destino aberto no painel "Revisar" (usa os dados já carregados)
  const [reviewTarget, setReviewTarget] = useState<Destination | null>(null)
  // onClose estável: o Modal capi refoca o painel quando onClose muda
  const closeReview = useCallback(() => setReviewTarget(null), [])
  const closeReject = useCallback(() => setRejectTarget(null), [])

  const buildUrl = useCallback(
    (currentOffset: number) => {
      const params = new URLSearchParams({ limit: "20", offset: String(currentOffset) })
      if (activeTab !== "TODOS") params.set("status", activeTab)
      return `/api/admin/destinations?${params}`
    },
    [activeTab],
  )

  const loadDestinations = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    setOffset(0)
    setHasMore(true)
    fetch(buildUrl(0))
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        const list: Destination[] = Array.isArray(data) ? data : (data.destinations ?? [])
        setDestinations(list)
        setHasMore(list.length === 20)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [buildUrl])

  function loadMore() {
    const nextOffset = offset + 20
    setLoadingMore(true)
    fetch(buildUrl(nextOffset))
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        const list: Destination[] = Array.isArray(data) ? data : (data.destinations ?? [])
        setDestinations((prev) => [...prev, ...list])
        setOffset(nextOffset)
        setHasMore(list.length === 20)
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }

  useEffect(() => {
    loadDestinations()
  }, [loadDestinations])

  async function handleApprove(dest: Destination) {
    setActionLoading(dest.id)
    setActionError(null)
    setDestinations((prev) =>
      activeTab === "TODOS"
        ? prev.map((d) => (d.id === dest.id ? { ...d, approvalStatus: "APPROVED" as ApprovalStatus } : d))
        : prev.filter((d) => d.id !== dest.id),
    )
    try {
      const res = await fetch(`/api/admin/destinations/${dest.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: "APPROVED" }),
      })
      if (!res.ok) throw new Error()
      toast.success("Destino aprovado com sucesso.")
    } catch {
      setDestinations((prev) =>
        activeTab === "TODOS"
          ? prev.map((d) => (d.id === dest.id ? { ...d, approvalStatus: dest.approvalStatus } : d))
          : [dest, ...prev],
      )
      setActionError("Não foi possível aprovar o destino. Tente novamente.")
      toast.error("Erro ao processar ação. Tente novamente.")
    } finally {
      setActionLoading(null)
    }
  }

  function handleReject(dest: Destination) {
    setRejectTarget(dest)
    setRejectReason("")
    setRejectError(null)
  }

  async function handleRejectSubmit() {
    if (!rejectTarget || !rejectReason.trim()) {
      setRejectError("Informe o motivo da rejeição.")
      return
    }
    setRejectSubmitting(true)
    setRejectError(null)
    setDestinations((prev) =>
      activeTab === "TODOS"
        ? prev.map((d) =>
            d.id === rejectTarget.id
              ? { ...d, approvalStatus: "REJECTED" as ApprovalStatus, rejectionReason: rejectReason }
              : d,
          )
        : prev.filter((d) => d.id !== rejectTarget.id),
    )
    try {
      const res = await fetch(`/api/admin/destinations/${rejectTarget.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: "REJECTED", rejectionReason: rejectReason }),
      })
      if (!res.ok) throw new Error()
      toast.success("Destino rejeitado.")
      setRejectTarget(null)
      setRejectReason("")
    } catch {
      setDestinations((prev) =>
        activeTab === "TODOS"
          ? prev.map((d) => (d.id === rejectTarget.id ? { ...d, approvalStatus: rejectTarget.approvalStatus, rejectionReason: rejectTarget.rejectionReason } : d))
          : [rejectTarget, ...prev],
      )
      setRejectError("Não foi possível rejeitar o destino. Tente novamente.")
      toast.error("Erro ao processar ação. Tente novamente.")
    } finally {
      setRejectSubmitting(false)
    }
  }

  const emptyMessage =
    activeTab === "TODOS"
      ? "Nenhum destino cadastrado ainda."
      : activeTab === "PENDING"
        ? "Nenhum destino aguardando aprovação."
        : activeTab === "APPROVED"
          ? "Nenhum destino aprovado ainda."
          : "Nenhum destino rejeitado."

  const emptyDescription =
    activeTab === "PENDING"
      ? "Quando uma operadora enviar um destino, ele aparece aqui para revisão."
      : "Os destinos enviados pelas operadoras aparecem aqui."

  return (
    <>
      <PageHeader
        eyebrow="Moderação"
        title="Destinos"
        description="Revise os destinos enviados pelas operadoras antes de publicá-los no marketplace."
      />

      <Tabs
        items={TABS}
        value={activeTab}
        onChange={(v) => setActiveTab(v as Tab)}
        label="Filtrar destinos por status"
        className="mb-6"
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
              <Skeleton width={72} height={72} radius={12} />
              <div className="capi-row__main flex flex-col gap-2">
                <Skeleton width="50%" height={14} />
                <Skeleton width="35%" height={12} />
              </div>
            </div>
          ))}
        </ListGroup>
      ) : loadError ? (
        <Alert
          tone="danger"
          title="Erro ao carregar destinos."
          action={
            <Button variant="secondary" size="sm" iconLeft={RotateCw} onClick={loadDestinations}>
              Tentar novamente
            </Button>
          }
        >
          Verifique sua conexão e tente de novo.
        </Alert>
      ) : destinations.length === 0 ? (
        <ListGroup>
          <EmptyState icon={MapIcon} title={emptyMessage} description={emptyDescription} />
        </ListGroup>
      ) : (
        <div>
          <ListGroup>
            {destinations.map((dest) => {
              const busy = actionLoading === dest.id
              return (
                <QueueRow
                  key={dest.id}
                  busy={busy}
                  thumb={<Thumb src={dest.heroImageUrl} alt={dest.title} />}
                  title={dest.title}
                  subtitle={`${dest.state} · ${operatorName(dest)}`}
                  meta={`Enviado em ${formatDate(dest.createdAt)}`}
                  note={
                    dest.approvalStatus === "REJECTED" && dest.rejectionReason
                      ? `Motivo: ${dest.rejectionReason}`
                      : null
                  }
                  status={<StatusBadge kind="approval" status={dest.approvalStatus} />}
                  actions={
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconLeft={Eye}
                        onClick={() => setReviewTarget(dest)}
                        aria-label={`Revisar destino ${dest.title}`}
                      >
                        Revisar
                      </Button>
                      {dest.approvalStatus === "PENDING" ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleReject(dest)}
                            disabled={busy}
                            aria-label={`Rejeitar destino ${dest.title}`}
                          >
                            Rejeitar
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            iconLeft={Check}
                            onClick={() => handleApprove(dest)}
                            loading={busy}
                            aria-label={`Aprovar destino ${dest.title}`}
                          >
                            Aprovar
                          </Button>
                        </>
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

      {/* Revisar: detalhes do destino já carregado */}
      <Modal
        open={!!reviewTarget}
        onClose={closeReview}
        title={reviewTarget?.title ?? "Destino"}
        description={reviewTarget ? `${reviewTarget.state} · ${operatorName(reviewTarget)}` : undefined}
        size="lg"
        footer={
          reviewTarget?.approvalStatus === "PENDING" ? (
            <>
              <Button
                variant="secondary"
                iconLeft={X}
                onClick={() => {
                  const target = reviewTarget
                  setReviewTarget(null)
                  if (target) handleReject(target)
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
                Aprovar destino
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setReviewTarget(null)}>
              Fechar
            </Button>
          )
        }
      >
        {reviewTarget ? (
          <div className="flex flex-col gap-5">
            <Media
              src={reviewTarget.heroImageUrl}
              alt={reviewTarget.title}
              ratio="16 / 9"
              placeholder="mountain"
              sizes="(max-width: 640px) 100vw, 720px"
            />
            <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailItem label="Status">
                <StatusBadge kind="approval" status={reviewTarget.approvalStatus} />
              </DetailItem>
              <DetailItem label="Enviado em">{formatDate(reviewTarget.createdAt)}</DetailItem>
              <DetailItem label="Local">{reviewTarget.state || "—"}</DetailItem>
              <DetailItem label="Operadora">{operatorName(reviewTarget)}</DetailItem>
              <DetailItem label="Enviado por">
                {reviewTarget.createdBy ? `${reviewTarget.createdBy.name} · ${reviewTarget.createdBy.email}` : "—"}
              </DetailItem>
              <DetailItem label="Endereço (slug)">{reviewTarget.slug}</DetailItem>
            </dl>
            {reviewTarget.approvalStatus === "REJECTED" && reviewTarget.rejectionReason ? (
              <Alert tone="danger" title="Motivo da rejeição">
                {reviewTarget.rejectionReason}
              </Alert>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Rejeição com motivo obrigatório */}
      <Modal
        open={!!rejectTarget}
        onClose={closeReject}
        title="Rejeitar destino"
        description={
          rejectTarget
            ? `Explique o que precisa mudar em "${rejectTarget.title}". A operadora verá este motivo.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleRejectSubmit} loading={rejectSubmitting}>
              {rejectSubmitting ? "Rejeitando..." : "Rejeitar destino"}
            </Button>
          </>
        }
      >
        <Textarea
          label="Motivo da rejeição"
          rows={4}
          placeholder="Ex.: as fotos estão em baixa resolução e a descrição não informa o acesso."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          error={rejectError}
          autoFocus
        />
      </Modal>
    </>
  )
}
