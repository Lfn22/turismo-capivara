"use client"
import { use, useState, useEffect, useCallback, type ReactNode } from "react"
import { Check, Copy, Eye, RotateCw, Users, X } from "lucide-react"
import {
  Alert,
  Avatar,
  Badge,
  Button,
  EmptyState,
  ListGroup,
  Modal,
  PageHeader,
  Skeleton,
  StatusBadge,
  Tabs,
  Textarea,
} from "@/src/components/ui/capi"

function CopyLinkBanner({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  const link = typeof window !== "undefined"
    ? `${window.location.origin}/${slug}/cadastro`
    : `/${slug}/cadastro`

  function handleCopy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Alert
      tone="brand"
      title="Link de cadastro para guias"
      className="mb-6"
      action={
        <Button
          variant={copied ? "secondary" : "primary"}
          size="sm"
          iconLeft={copied ? Check : Copy}
          onClick={handleCopy}
          aria-live="polite"
        >
          {copied ? "Link copiado" : "Copiar link"}
        </Button>
      }
    >
      <p className="m-0 mb-1">Envie este link para os guias se cadastrarem na sua operadora.</p>
      <p className="m-0 font-semibold text-fg" style={{ wordBreak: "break-all" }}>{link}</p>
    </Alert>
  )
}

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED"

/** Linha da fila de aprovação: avatar, dados e ações; ações descem para a linha de baixo no mobile. */
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

function TagList({ items }: { items: string[] | undefined }) {
  if (!items || items.length === 0) return <>—</>
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {items.map((t) => (
        <Badge key={t}>{t}</Badge>
      ))}
    </span>
  )
}

interface GuideUser {
  id: string
  name: string
  email: string
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED"
  rejectionReason: string | null
}

interface Guide {
  id: string
  bio: string | null
  especialidades: string[]
  regioes: string[]
  user: GuideUser
}

export default function AdminGuiasPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Rejection modal state
  const [rejectGuide, setRejectGuide] = useState<Guide | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [rejectSubmitting, setRejectSubmitting] = useState(false)

  // Só apresentação: filtro por status e guia aberto em "Revisar" (dados já carregados)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [reviewGuide, setReviewGuide] = useState<Guide | null>(null)
  const closeReview = useCallback(() => setReviewGuide(null), [])
  const closeReject = useCallback(() => {
    setRejectGuide(null)
    setRejectReason("")
    setRejectError(null)
  }, [])

  function loadGuides() {
    setLoading(true)
    setLoadError(false)
    fetch(`/api/proxy?path=/tenants/${slug}/admin/guides`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) =>
        setGuides(Array.isArray(data) ? data : data.guides ?? [])
      )
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadGuides()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  async function handleApprove(guide: Guide) {
    setActionLoading(guide.id)
    setActionError(null)
    // Optimistic update
    setGuides((prev) =>
      prev.map((g) =>
        g.id === guide.id
          ? { ...g, user: { ...g.user, approvalStatus: "APPROVED" } }
          : g
      )
    )
    try {
      const res = await fetch(
        `/api/proxy?path=/tenants/${slug}/admin/guides/${guide.id}/approve`,
        { method: "PATCH" }
      )
      if (!res.ok) throw new Error()
    } catch {
      // Revert on failure
      setGuides((prev) =>
        prev.map((g) =>
          g.id === guide.id
            ? { ...g, user: { ...g.user, approvalStatus: "PENDING" } }
            : g
        )
      )
      setActionError("Não foi possível realizar a ação. Tente novamente.")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRejectConfirm() {
    if (!rejectGuide) return
    if (!rejectReason.trim()) {
      setRejectError("Informe o motivo da rejeição.")
      return
    }
    setRejectSubmitting(true)
    setRejectError(null)

    try {
      const res = await fetch(
        `/api/proxy?path=/tenants/${slug}/admin/guides/${rejectGuide.id}/reject`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rejectReason }),
        }
      )
      if (!res.ok) throw new Error()

      // Update local state
      const reason = rejectReason
      const id = rejectGuide.id
      setGuides((prev) =>
        prev.map((g) =>
          g.id === id
            ? {
                ...g,
                user: {
                  ...g.user,
                  approvalStatus: "REJECTED",
                  rejectionReason: reason,
                },
              }
            : g
        )
      )
      setRejectGuide(null)
      setRejectReason("")
    } catch {
      setRejectError("Não foi possível rejeitar o guia. Tente novamente.")
    } finally {
      setRejectSubmitting(false)
    }
  }

  const pending = guides.filter(
    (g) => g.user.approvalStatus === "PENDING"
  )
  const others = guides.filter(
    (g) => g.user.approvalStatus !== "PENDING"
  )
  const ordered = [...pending, ...others]
  const visible =
    statusFilter === "ALL"
      ? ordered
      : ordered.filter((g) => g.user.approvalStatus === statusFilter)
  const countOf = (s: GuideUser["approvalStatus"]) =>
    guides.filter((g) => g.user.approvalStatus === s).length

  const tabs = [
    { value: "ALL", label: "Todos", count: guides.length },
    { value: "PENDING", label: "Em análise", count: countOf("PENDING") },
    { value: "APPROVED", label: "Aprovados", count: countOf("APPROVED") },
    { value: "REJECTED", label: "Rejeitados", count: countOf("REJECTED") },
  ]

  function openReject(guide: Guide) {
    setRejectGuide(guide)
    setRejectReason("")
    setRejectError(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="Equipe"
        title="Aprovação de guias"
        description="Revise os guias que se cadastraram na sua operadora. Só guias aprovados aparecem para os turistas."
      />

      <CopyLinkBanner slug={slug} />

      {!loading && !loadError && guides.length > 0 ? (
        <Tabs
          items={tabs}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          label="Filtrar guias por status"
          className="mb-6"
        />
      ) : null}

      {actionError && (
        <Alert tone="danger" className="mb-4">
          {actionError}
        </Alert>
      )}

      {loading ? (
        <ListGroup>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="capi-row" aria-hidden="true">
              <Skeleton width={48} height={48} radius={24} />
              <div className="capi-row__main flex flex-col gap-2">
                <Skeleton width="40%" height={14} />
                <Skeleton width="55%" height={12} />
              </div>
            </div>
          ))}
        </ListGroup>
      ) : loadError ? (
        <Alert
          tone="danger"
          title="Erro ao carregar dados. Tente novamente."
          action={
            <Button variant="secondary" size="sm" iconLeft={RotateCw} onClick={loadGuides}>
              Tentar novamente
            </Button>
          }
        />
      ) : guides.length === 0 ? (
        <ListGroup>
          <EmptyState
            icon={Users}
            title="Nenhum guia cadastrado ainda."
            description="Compartilhe o link de cadastro acima para os guias da sua região entrarem na equipe."
          />
        </ListGroup>
      ) : visible.length === 0 ? (
        <ListGroup>
          <EmptyState
            compact
            icon={Users}
            title={
              statusFilter === "PENDING"
                ? "Nenhum guia aguardando aprovação."
                : statusFilter === "APPROVED"
                  ? "Nenhum guia aprovado ainda."
                  : "Nenhum guia rejeitado."
            }
          />
        </ListGroup>
      ) : (
        <ListGroup>
          {visible.map((guide) => {
            const isActing = actionLoading === guide.id
            const specialties = guide.especialidades?.slice(0, 3).join(", ")
            return (
              <QueueRow
                key={guide.id}
                busy={isActing}
                lead={<Avatar name={guide.user.name} size={48} />}
                title={guide.user.name}
                subtitle={guide.user.email}
                meta={specialties || undefined}
                note={
                  guide.user.approvalStatus === "REJECTED" && guide.user.rejectionReason
                    ? `Motivo: ${guide.user.rejectionReason}`
                    : null
                }
                status={<StatusBadge kind="approval" status={guide.user.approvalStatus} />}
                actions={
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconLeft={Eye}
                      onClick={() => setReviewGuide(guide)}
                      aria-label={`Revisar guia ${guide.user.name}`}
                    >
                      Revisar
                    </Button>
                    {guide.user.approvalStatus === "PENDING" && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openReject(guide)}
                          disabled={isActing}
                          aria-label={`Rejeitar guia ${guide.user.name}`}
                        >
                          Rejeitar
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          iconLeft={Check}
                          onClick={() => handleApprove(guide)}
                          loading={isActing}
                          aria-label={`Aprovar guia ${guide.user.name}`}
                        >
                          Aprovar
                        </Button>
                      </>
                    )}
                  </>
                }
              />
            )
          })}
        </ListGroup>
      )}

      {/* Revisar: perfil do guia já carregado */}
      <Modal
        open={!!reviewGuide}
        onClose={closeReview}
        title={reviewGuide?.user.name ?? "Guia"}
        description={reviewGuide?.user.email}
        footer={
          reviewGuide?.user.approvalStatus === "PENDING" ? (
            <>
              <Button
                variant="secondary"
                iconLeft={X}
                onClick={() => {
                  const target = reviewGuide
                  setReviewGuide(null)
                  if (target) openReject(target)
                }}
              >
                Rejeitar
              </Button>
              <Button
                variant="primary"
                iconLeft={Check}
                onClick={() => {
                  const target = reviewGuide
                  setReviewGuide(null)
                  if (target) handleApprove(target)
                }}
              >
                Aprovar guia
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={closeReview}>
              Fechar
            </Button>
          )
        }
      >
        {reviewGuide ? (
          <div className="flex flex-col gap-5">
            <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailItem label="Status">
                <StatusBadge kind="approval" status={reviewGuide.user.approvalStatus} />
              </DetailItem>
              <DetailItem label="E-mail">{reviewGuide.user.email}</DetailItem>
              <DetailItem label="Especialidades">
                <TagList items={reviewGuide.especialidades} />
              </DetailItem>
              <DetailItem label="Regiões">
                <TagList items={reviewGuide.regioes} />
              </DetailItem>
            </dl>
            {reviewGuide.bio ? (
              <div>
                <p className="m-0 text-[13px] text-fg-secondary">Sobre</p>
                <p className="m-0 mt-1 text-[15px] leading-relaxed text-fg whitespace-pre-line">{reviewGuide.bio}</p>
              </div>
            ) : null}
            {reviewGuide.user.approvalStatus === "REJECTED" && reviewGuide.user.rejectionReason ? (
              <Alert tone="danger" title="Motivo da rejeição">
                {reviewGuide.user.rejectionReason}
              </Alert>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Rejeição com motivo obrigatório */}
      <Modal
        open={!!rejectGuide}
        onClose={closeReject}
        title="Rejeitar guia"
        description="Informe o motivo da rejeição. O guia poderá ver esta mensagem."
        footer={
          <>
            <Button variant="secondary" onClick={closeReject}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleRejectConfirm} loading={rejectSubmitting}>
              {rejectSubmitting ? "Rejeitando..." : "Rejeitar guia"}
            </Button>
          </>
        }
      >
        <Textarea
          id="reject-reason"
          label="Motivo"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={4}
          placeholder="Ex.: faltou enviar o certificado de condutor."
          autoFocus
          error={rejectError}
        />
      </Modal>
    </>
  )
}
