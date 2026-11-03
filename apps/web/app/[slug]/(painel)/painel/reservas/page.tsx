"use client"
import { use, useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { CalendarDays, Check, Mail, Users, X } from "lucide-react"
import {
  Alert,
  Avatar,
  Button,
  ListGroup,
  ListRow,
  Modal,
  PageHeader,
  Skeleton,
  StatusBadge,
  Tabs,
  type TabItem,
} from "@/src/components/ui/capi"
import CancelDialog from "@/src/components/ui/CancelDialog"
import EmptyState from "@/src/components/ui/EmptyState"

interface Booking {
  id: string
  customerName: string
  customerEmail: string
  pax: number
  status: string
  createdAt: string
  slot: {
    startsAt: string
    package: { name: string; price: string | number }
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

/** Valor estimado: preço por pessoa do roteiro × nº de pessoas. */
function bookingValue(b: Booking) {
  const price = Number(b.slot?.package?.price)
  return Number.isFinite(price) ? formatBRL(price * b.pax) : null
}

function pessoas(n: number) {
  return `${n} ${n === 1 ? "pessoa" : "pessoas"}`
}

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "Todas" },
  { value: "PENDING", label: "Pendentes" },
  { value: "CONFIRMED", label: "Confirmadas" },
  { value: "CHECKED_IN", label: "Check-in" },
  { value: "COMPLETED", label: "Concluídas" },
  { value: "CANCELLED", label: "Canceladas" },
]

export default function ReservasPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  const bookingsEndpoint =
    role === "CONDUTOR"
      ? `/tenants/${slug}/guides/me/bookings`
      : `/tenants/${slug}/bookings`

  function loadBookings() {
    setLoading(true)
    setError(null)
    fetch(`/api/proxy?path=${bookingsEndpoint}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => setBookings(data.bookings ?? []))
      .catch(() => setError("Erro ao carregar dados. Tente novamente."))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!role) return
    loadBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, role])

  async function handleConfirm(id: string) {
    setActionLoading(id)
    const prevBookings = bookings
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "CONFIRMED" } : b))
    )
    try {
      const res = await fetch(`/api/proxy?path=/tenants/${slug}/bookings/${id}/confirm`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao processar.")
      }
      toast.success("Reserva confirmada.")
    } catch (err) {
      setBookings(prevBookings)
      toast.error(err instanceof Error ? err.message : "Erro ao processar.")
    } finally {
      setActionLoading(null)
    }
  }

  function handleCancel(id: string) {
    setPendingCancelId(id)
    setCancelDialogOpen(true)
  }

  async function executeCancel() {
    if (!pendingCancelId) return
    const id = pendingCancelId
    setCancelDialogOpen(false)
    setPendingCancelId(null)
    setActionLoading(id)
    const prevBookings = bookings
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "CANCELLED" } : b))
    )
    try {
      const res = await fetch(`/api/proxy?path=/tenants/${slug}/bookings/${id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao processar.")
      }
      toast.success("Reserva cancelada.")
    } catch (err) {
      setBookings(prevBookings)
      toast.error(err instanceof Error ? err.message : "Erro ao processar.")
    } finally {
      setActionLoading(null)
    }
  }

  const filtered =
    statusFilter === "ALL"
      ? bookings
      : bookings.filter((b) => b.status === statusFilter)

  const tabs: TabItem[] = STATUS_TABS.map((t) => ({
    ...t,
    count: loading || error
      ? undefined
      : t.value === "ALL"
        ? bookings.length
        : bookings.filter((b) => b.status === t.value).length,
  }))

  const detail = detailId ? bookings.find((b) => b.id === detailId) ?? null : null
  const canConfirm = detail?.status === "PENDING"
  const canCancel = detail?.status === "PENDING" || detail?.status === "CONFIRMED"

  return (
    <>
      <PageHeader
        eyebrow="Painel do guia"
        title="Reservas"
        description="Confirme, acompanhe e cancele as reservas dos seus roteiros."
      />

      <Tabs
        items={tabs}
        value={statusFilter}
        onChange={setStatusFilter}
        label="Filtrar por status"
        className="mb-4"
      />

      {loading ? (
        <ListGroup>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="capi-row" aria-hidden="true">
              <Skeleton width={40} height={40} radius={999} />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton width="55%" height={14} />
                <Skeleton width="80%" height={12} />
              </div>
              <Skeleton width={72} height={22} radius={999} />
            </div>
          ))}
        </ListGroup>
      ) : error ? (
        <Alert
          tone="danger"
          title={error}
          action={
            <Button variant="secondary" size="sm" onClick={loadBookings}>
              Tentar novamente
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <ListGroup>
          <EmptyState
            title="Nenhuma reserva encontrada"
            description="Divulgue o link da sua página para receber as primeiras reservas."
            ctaLabel="Copiar link"
            onCtaClick={() => {
              navigator.clipboard.writeText(window.location.origin + "/" + slug)
              toast.success("Link copiado!")
            }}
          />
        </ListGroup>
      ) : (
        <ListGroup>
          {filtered.map((b) => (
            <ListRow
              key={b.id}
              onClick={() => setDetailId(b.id)}
              leading={<Avatar name={b.customerName} size={40} />}
              title={`${b.customerName} · ${pessoas(b.pax)}`}
              subtitle={`${b.slot?.package?.name ?? ""} · ${formatDate(b.slot?.startsAt)}`}
              trailing={<StatusBadge status={b.status} />}
              meta={bookingValue(b)}
            />
          ))}
        </ListGroup>
      )}

      {/* Detalhe da reserva — sheet no celular, caixa centrada a partir de 640px */}
      <Modal
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail?.customerName ?? "Reserva"}
        description={detail?.slot?.package?.name}
        footer={
          detail && (canConfirm || canCancel) ? (
            <>
              {canCancel && (
                <Button
                  variant="secondary"
                  iconLeft={X}
                  disabled={actionLoading === detail.id}
                  aria-label={`Cancelar reserva de ${detail.customerName}`}
                  onClick={() => {
                    const id = detail.id
                    setDetailId(null)
                    handleCancel(id)
                  }}
                >
                  Cancelar reserva
                </Button>
              )}
              {canConfirm && (
                <Button
                  iconLeft={Check}
                  loading={actionLoading === detail.id}
                  aria-label={`Confirmar reserva de ${detail.customerName}`}
                  onClick={() => handleConfirm(detail.id)}
                >
                  Confirmar reserva
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {detail && (
          <dl className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-fg-secondary text-sm">Status</dt>
              <dd><StatusBadge status={detail.status} /></dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-fg-secondary text-sm inline-flex items-center gap-2">
                <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />
                Data e hora
              </dt>
              <dd className="text-fg font-semibold">{formatDate(detail.slot?.startsAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-fg-secondary text-sm inline-flex items-center gap-2">
                <Users size={16} strokeWidth={1.75} aria-hidden="true" />
                Pessoas
              </dt>
              <dd className="text-fg font-semibold">{pessoas(detail.pax)}</dd>
            </div>
            {detail.customerEmail && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-fg-secondary text-sm inline-flex items-center gap-2">
                  <Mail size={16} strokeWidth={1.75} aria-hidden="true" />
                  E-mail
                </dt>
                <dd className="text-fg font-semibold min-w-0 truncate">
                  <a href={`mailto:${detail.customerEmail}`} className="text-fg-primary">{detail.customerEmail}</a>
                </dd>
              </div>
            )}
            {bookingValue(detail) && (
              <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                <dt className="text-fg-secondary text-sm">Valor estimado</dt>
                <dd className="text-fg font-bold">{bookingValue(detail)}</dd>
              </div>
            )}
          </dl>
        )}
      </Modal>

      {/* Cancel confirmation dialog */}
      <CancelDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={executeCancel}
        loading={actionLoading === pendingCancelId}
      />
    </>
  )
}
