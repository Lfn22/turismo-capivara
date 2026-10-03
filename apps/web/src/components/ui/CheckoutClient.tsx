'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  Copy,
  ExternalLink,
  ShieldCheck,
  Ticket,
  TicketX,
  Users,
} from 'lucide-react';
import { Alert, Badge, BookingSummary, Button, EmptyState, Skeleton } from '@/src/components/ui/capi';

interface Booking {
  id: string
  status: string
  pax: number
  expiresAt: string | null
  qrCode: string | null
  paymentUrl: string | null
  slot?: {
    startsAt: string
    package?: {
      name: string
    }
  }
}

interface CheckoutClientProps {
  slug: string
  bookingId: string
  email: string
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando pagamento',
  CONFIRMED: 'Pagamento confirmado!',
  COMPLETED: 'Reserva concluída',
  CANCELLED: 'Reserva cancelada',
  EXPIRED: 'PIX expirado',
}

function formatDateBR(dateStr: string) {
  return new Date(dateStr).toLocaleString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function useCountdown(expiresAt: string | null) {
  const [seconds, setSeconds] = useState<number | null>(null)

  useEffect(() => {
    if (!expiresAt) return
    const target = new Date(expiresAt).getTime()

    function tick() {
      const diff = Math.floor((target - Date.now()) / 1000)
      setSeconds(diff > 0 ? diff : 0)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return seconds
}

export default function CheckoutClient({ slug, bookingId, email }: CheckoutClientProps) {
  const router = useRouter()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchInitialBooking = useCallback(async () => {
    if (!bookingId || !email) return
    try {
      const res = await fetch(
        `/api/${slug}/bookings/${bookingId}?email=${encodeURIComponent(email)}`,
        { cache: 'no-store' }
      )
      if (!res.ok) throw new Error('Reserva não encontrada.')
      const data: Booking = await res.json()
      setBooking(data)
      setLoading(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar reserva.')
      setLoading(false)
    }
  }, [slug, bookingId, email])

  const pollStatus = useCallback(async () => {
    if (!bookingId || !email) return
    try {
      const res = await fetch(
        `/api/${slug}/bookings/${bookingId}/status?email=${encodeURIComponent(email)}`,
        { cache: 'no-store' }
      )
      if (!res.ok) return
      const data: { status: string } = await res.json()
      setBooking(prev => prev ? { ...prev, status: data.status } : prev)
      return data.status
    } catch {
      // silently ignore poll errors — initial data preserved
    }
  }, [slug, bookingId, email])

  // Initial fetch — loads full booking (qrCode, expiresAt, pax, etc.)
  useEffect(() => {
    fetchInitialBooking()
  }, [fetchInitialBooking])

  // Poll while PENDING — only updates status, preserves full booking state (WR-01)
  useEffect(() => {
    if (!booking || booking.status !== 'PENDING') return

    let cancelled = false
    const interval = setInterval(async () => {
      if (cancelled) return
      const status = await pollStatus()
      if (status && (status === 'CONFIRMED' || status === 'CANCELLED' || status === 'EXPIRED')) clearInterval(interval)
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.status, pollStatus])

  // Redirect to confirmacao on success
  useEffect(() => {
    if (booking?.status === 'CONFIRMED' || booking?.status === 'COMPLETED') {
      const timer = setTimeout(() => {
        router.push(`/${slug}/confirmacao?bookingId=${bookingId}&email=${encodeURIComponent(email)}`)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [booking?.status, router, slug, bookingId, email])

  const countdown = useCountdown(booking?.expiresAt ?? null)

  function handleCopy() {
    if (!booking?.qrCode) return
    navigator.clipboard.writeText(booking.qrCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  if (!bookingId || !email) {
    return (
      <div className="capi-container capi-container--form py-8">
        <EmptyState
          icon={TicketX}
          title="Link de pagamento incompleto"
          description="Parâmetros inválidos. Volte ao roteiro e tente novamente."
          action={
            <Button href={`/${slug}/roteiros`} variant="secondary">
              Ver roteiros
            </Button>
          }
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="capi-container capi-container--content py-6" aria-busy="true">
        <p className="sr-only-capi" role="status">Carregando reserva…</p>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-6">
            <Skeleton width={140} height={24} radius={999} />
            <Skeleton width={200} height={200} radius={12} />
            <Skeleton height={64} radius={12} />
            <Skeleton height={52} radius={12} />
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
            <Skeleton width="70%" height={18} />
            <Skeleton lines={4} />
          </div>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="capi-container capi-container--form py-8">
        <Alert
          tone="danger"
          title="Não foi possível carregar a reserva"
          action={
            <Button href={`/${slug}/roteiros`} variant="secondary" size="sm" iconLeft={ArrowLeft}>
              Ver roteiros
            </Button>
          }
        >
          {error ?? 'Reserva não encontrada.'}
        </Alert>
      </div>
    )
  }

  const isSuccess = booking.status === 'CONFIRMED' || booking.status === 'COMPLETED'
  const isCancelled = booking.status === 'CANCELLED'
  const isPending = booking.status === 'PENDING'
  const isExpired = countdown !== null && countdown === 0 && isPending

  const packageName = booking.slot?.package?.name ?? 'Roteiro'
  const slotDate = booking.slot?.startsAt
  const showPix = isPending && !isExpired && booking.qrCode

  return (
    <div className="capi-container capi-container--content py-6 md:py-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="mx-auto flex w-full flex-col gap-4" style={{ maxWidth: 'var(--container-form)' }}>
          {/* Estado do pagamento */}
          {isSuccess && (
            <Alert tone="success" title={STATUS_LABELS[booking.status] ?? booking.status}>
              Redirecionando para confirmação…
            </Alert>
          )}
          {(isCancelled || isExpired) && (
            <Alert
              tone="danger"
              title={isExpired ? 'PIX expirado' : STATUS_LABELS[booking.status] ?? booking.status}
            >
              {isExpired
                ? 'O prazo para pagamento terminou. Escolha a data de novo para gerar outro código.'
                : 'Esta reserva não está mais ativa.'}
            </Alert>
          )}
          {isPending && !isExpired && !booking.qrCode && (
            <Alert tone="warning" title={STATUS_LABELS[booking.status] ?? booking.status}>
              Aguardando confirmação do pagamento…
            </Alert>
          )}
          {!isSuccess && !isCancelled && !isPending && (
            <Alert tone="info" title={STATUS_LABELS[booking.status] ?? booking.status} />
          )}

          {/* PIX — só se pendente e não expirado */}
          {showPix && (
            <section
              aria-labelledby="pix-title"
              className="flex flex-col items-center gap-5 rounded-2xl border border-line bg-surface p-5 text-center sm:p-6"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="flex flex-col items-center gap-2">
                {countdown !== null && (
                  <Badge tone="warning" icon={Clock}>
                    Expira em {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                  </Badge>
                )}
                <h2 id="pix-title" className="m-0 text-xl">Pague via PIX</h2>
                <p className="m-0 text-sm text-fg-secondary">
                  Escaneie o QR code ou copie o código e cole no app do seu banco.
                </p>
              </div>

              <div
                className="rounded-xl p-3"
                style={{ background: 'var(--sand-0)', color: 'var(--sand-900)', border: '1px solid var(--border)' }}
              >
                <QRCode
                  value={booking.qrCode as string}
                  size={192}
                  level="M"
                  bgColor="transparent"
                  fgColor="currentColor"
                  style={{ display: 'block', height: 'auto', maxWidth: '100%', width: 'min(192px, 60vw)' }}
                  aria-label="QR code PIX para pagamento da reserva"
                />
              </div>

              <div className="w-full text-left">
                <p className="m-0 mb-1.5 text-sm font-semibold text-fg">Código copia e cola</p>
                <div
                  className="max-h-20 overflow-y-auto break-all rounded-lg border border-line bg-subtle p-3 font-mono text-xs leading-relaxed text-fg-secondary"
                >
                  {booking.qrCode}
                </div>
              </div>

              <Button size="lg" fullWidth iconLeft={copied ? Check : Copy} onClick={handleCopy}>
                {copied ? 'Código copiado!' : 'Copiar código PIX'}
              </Button>

              {booking.paymentUrl && (
                <Button
                  href={booking.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                  fullWidth
                  iconRight={ExternalLink}
                >
                  Abrir página de pagamento
                </Button>
              )}

              <p className="m-0 inline-flex items-center gap-2 text-sm text-fg-secondary" role="status">
                <span className="capi-spinner" aria-hidden="true" />
                Aguardando confirmação do pagamento…
              </p>
              <p className="m-0 inline-flex items-center gap-1.5 text-xs text-fg-tertiary">
                <ShieldCheck size={14} strokeWidth={1.75} aria-hidden="true" />
                Pagamento processado pelo Mercado Pago
              </p>
            </section>
          )}

          {/* Expirado */}
          {isExpired && (
            <Button href={`/${slug}/roteiros`} size="lg" fullWidth>
              Tentar novamente
            </Button>
          )}
        </div>

        {/* Resumo — abaixo no mobile, coluna lateral sticky no desktop */}
        <BookingSummary
          className="lg:sticky lg:top-24"
          title="Resumo da reserva"
          subtitle={packageName}
          details={[
            ...(slotDate ? [{ icon: CalendarDays, label: 'Data', value: formatDateBR(slotDate) }] : []),
            { icon: Users, label: 'Pessoas', value: `${booking.pax} pessoa${booking.pax !== 1 ? 's' : ''}` },
            {
              icon: Ticket,
              label: 'N° reserva',
              value: <span className="font-mono text-sm">{booking.id.slice(0, 8).toUpperCase()}</span>,
            },
          ]}
        />
      </div>
    </div>
  )
}
