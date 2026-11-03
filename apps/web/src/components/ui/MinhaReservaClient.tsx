'use client'

import { useState, useCallback } from 'react'
import QRCode from 'react-qr-code'
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Check,
  CircleCheck,
  Clock,
  Copy,
  Mail,
  Map as MapIcon,
  MessageCircle,
  RotateCcw,
  Search,
  ShieldCheck,
  Ticket,
  Users,
  XCircle,
} from 'lucide-react'
import { Alert, Badge, Button, Input, Skeleton, StatusBadge } from '@/src/components/ui/capi'
import CancelDialog from '@/src/components/ui/CancelDialog'

type UiState = 'LOOKUP' | 'LOADING' | 'RESULT' | 'ERROR'

interface BookingResult {
  id: string
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED' | string
  customerName: string
  pax: number
  qrCode: string | null
  paymentUrl: string | null
  expiresAt: string | null
  tenantWhatsapp: string | null
  slot: { startsAt: string; packageName: string }
}

export default function MinhaReservaClient({ slug }: { slug: string }) {
  const [uiState, setUiState] = useState<UiState>('LOOKUP')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [booking, setBooking] = useState<BookingResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [copiedPix, setCopiedPix] = useState(false)

  const handleLookup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setUiState('LOADING')
    setErrorMsg('')
    try {
      const res = await fetch(`/api/${slug}/bookings/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (res.status === 429) {
        setErrorMsg('Muitas tentativas. Tente novamente em alguns minutos.')
        setUiState('ERROR')
        return
      }
      if (!res.ok) {
        setErrorMsg(
          data.message ??
          data.error ??
          'Reserva não encontrada ou dados inválidos. Verifique o e-mail e o código e tente novamente.'
        )
        setUiState('ERROR')
        return
      }
      setBooking(data)
      setUiState('RESULT')
    } catch {
      setErrorMsg('Ocorreu um erro. Tente novamente ou entre em contato com a operadora.')
      setUiState('ERROR')
    }
  }, [slug, email, code])

  const handleCancelConfirm = useCallback(async () => {
    if (!booking) return
    setCancelLoading(true)
    try {
      const res = await fetch(`/api/${slug}/bookings/cancel-self`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.message ?? data.error ?? 'Não foi possível cancelar a reserva.')
        setShowCancelModal(false)
        setUiState('ERROR')
      } else {
        setBooking((prev) => prev ? { ...prev, status: 'CANCELLED' } : prev)
        setShowCancelModal(false)
      }
    } catch {
      setErrorMsg('Ocorreu um erro. Tente novamente ou entre em contato com a operadora.')
      setShowCancelModal(false)
      setUiState('ERROR')
    } finally {
      setCancelLoading(false)
    }
  }, [slug, email, code, booking])

  const handleRepay = useCallback(async () => {
    if (!booking) return
    setUiState('LOADING')
    try {
      const res = await fetch(`/api/${slug}/bookings/repay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (res.status === 429) {
        setErrorMsg('Muitas tentativas. Tente novamente em alguns minutos.')
        setUiState('ERROR')
        return
      }
      if (!res.ok) {
        setErrorMsg(data.message ?? data.error ?? 'Não foi possível gerar novo pagamento.')
        setUiState('ERROR')
        return
      }
      setBooking((prev) =>
        prev
          ? { ...prev, status: 'PENDING', qrCode: data.qrCode ?? null, expiresAt: data.expiresAt ?? null }
          : prev
      )
      setUiState('RESULT')
    } catch {
      setErrorMsg('Ocorreu um erro. Tente novamente ou entre em contato com a operadora.')
      setUiState('ERROR')
    }
  }, [slug, email, code, booking])

  const handleCopyPix = useCallback(() => {
    if (booking?.qrCode) {
      navigator.clipboard.writeText(booking.qrCode).then(() => {
        setCopiedPix(true)
        setTimeout(() => setCopiedPix(false), 2000)
      }).catch(() => {/* clipboard not available */})
    }
  }, [booking])

  // ── LOOKUP state ──────────────────────────────────────────────────────────
  if (uiState === 'LOOKUP') {
    return (
      <div className="capi-container capi-container--form py-6 md:py-10">
        <h1 className="font-display m-0 mb-2 text-3xl">Minha reserva</h1>
        <p className="m-0 mb-6 text-sm text-fg-secondary">
          Digite seu e-mail e o código da reserva para consultar o status.
        </p>
        <form onSubmit={handleLookup} className="flex flex-col gap-4">
          <Input
            id="mr-email"
            label="E-mail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            leadingIcon={Mail}
          />
          <Input
            id="mr-code"
            label="Código da reserva"
            hint="Últimos 6 caracteres do código enviado por e-mail"
            type="text"
            required
            maxLength={6}
            minLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex: A1B2C3"
            autoComplete="off"
            inputMode="text"
            autoCapitalize="characters"
            leadingIcon={Ticket}
            style={{ textTransform: 'uppercase', letterSpacing: '0.15em' }}
          />
          <Button type="submit" size="lg" fullWidth iconLeft={Search} className="mt-2">
            Consultar reserva
          </Button>
        </form>
      </div>
    )
  }

  // ── LOADING state ─────────────────────────────────────────────────────────
  if (uiState === 'LOADING') {
    return (
      <div className="capi-container capi-container--form py-6 md:py-10" aria-busy="true">
        <p className="sr-only-capi" role="status">Consultando sua reserva…</p>
        <div className="flex flex-col gap-4">
          <Skeleton height={120} radius={16} />
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
            <Skeleton width="50%" height={28} />
            <Skeleton lines={3} />
          </div>
          <Skeleton height={52} radius={12} />
        </div>
      </div>
    )
  }

  // ── ERROR state ───────────────────────────────────────────────────────────
  if (uiState === 'ERROR') {
    return (
      <div className="capi-container capi-container--form py-6 md:py-10">
        <h1 className="font-display m-0 mb-6 text-3xl">Minha reserva</h1>
        <Alert tone="danger" className="mb-6">{errorMsg}</Alert>
        <Button size="lg" fullWidth iconLeft={RotateCcw} onClick={() => setUiState('LOOKUP')}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  // ── RESULT state ──────────────────────────────────────────────────────────
  if (!booking) return null

  const startsAt = new Date(booking.slot.startsAt)
  const formattedDate = startsAt.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const bookingCode = booking.id.slice(-6).toUpperCase()

  const whatsappUrl = booking.tenantWhatsapp
    ? `https://wa.me/${booking.tenantWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, tenho uma reserva: #${booking.id.slice(-6).toUpperCase()}`)}`
    : null

  const calendarStamp = startsAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const calendarUrl = `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: 'TEMPLATE',
    text: booking.slot.packageName,
    dates: `${calendarStamp}/${calendarStamp}`,
  }).toString()}`

  const details = [
    { icon: MapIcon, label: 'Roteiro', value: booking.slot.packageName },
    { icon: CalendarDays, label: 'Data', value: formattedDate },
    { icon: Clock, label: 'Saída', value: formattedTime },
    { icon: Users, label: 'Pessoas', value: `${booking.pax} ${booking.pax === 1 ? 'pessoa' : 'pessoas'}` },
  ]

  return (
    <div className="capi-container capi-container--form flex flex-col gap-4 py-6 md:py-10">
      {/* Faixa de marca quando confirmada */}
      {booking.status === 'CONFIRMED' ? (
        <section className="flex flex-col items-center gap-3 rounded-2xl bg-surface-brand px-5 py-8 text-center">
          <span
            className="inline-flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}
          >
            <CircleCheck size={30} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h1 className="font-display m-0 text-3xl" style={{ color: 'var(--text-on-brand)' }}>
            Reserva confirmada!
          </h1>
          <p className="m-0 text-sm" style={{ color: 'var(--text-on-brand-secondary)' }}>
            Seu guia entrará em contato.
          </p>
        </section>
      ) : (
        <h1 className="font-display m-0 text-3xl">Minha reserva</h1>
      )}

      {/* Card da reserva */}
      <section
        aria-label="Detalhes da reserva"
        className="rounded-2xl border border-line bg-surface p-5"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-line pb-4">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-wider text-fg-secondary">Código da reserva</p>
            <p className="m-0 font-mono text-2xl font-bold tracking-widest text-fg">#{bookingCode}</p>
          </div>
          {booking.status === 'EXPIRED' ? (
            <Badge tone="warning" dot>Tempo esgotado</Badge>
          ) : booking.status === 'PENDING' ? (
            <Badge tone="warning" dot>Aguardando pagamento</Badge>
          ) : (
            <span role="status" aria-live="polite"><StatusBadge kind="booking" status={booking.status} /></span>
          )}
        </div>
        <dl className="m-0 flex flex-col gap-3">
          {details.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <dt className="flex shrink-0 items-center gap-2 text-sm text-fg-secondary" style={{ minWidth: 104 }}>
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                {label}
              </dt>
              <dd className="m-0 ml-auto text-right text-sm font-medium text-fg first-letter:uppercase">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── PENDING section ── */}
      {booking.status === 'PENDING' && (
        <section
          aria-labelledby="mr-pix-title"
          className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-5 text-center"
        >
          <h2 id="mr-pix-title" className="m-0 text-lg">Pague via PIX</h2>
          <p className="m-0 text-sm text-fg-secondary">
            Escaneie o QR code com o app do seu banco ou copie a chave PIX abaixo.
          </p>
          {booking.qrCode ? (
            <>
              <div
                className="rounded-xl p-3"
                style={{ background: 'var(--sand-0)', color: 'var(--sand-900)', border: '1px solid var(--border)' }}
              >
                <QRCode
                  value={booking.qrCode}
                  size={200}
                  bgColor="transparent"
                  fgColor="currentColor"
                  style={{ display: 'block', height: 'auto', maxWidth: '100%', width: 'min(200px, 60vw)' }}
                  aria-label="QR code PIX para pagamento da reserva"
                />
              </div>
              <div className="w-full text-left">
                <p className="m-0 mb-1.5 text-sm font-semibold text-fg">Chave PIX (copia e cola)</p>
                <div
                  className="max-h-24 select-all overflow-y-auto break-all rounded-lg border border-line bg-subtle px-3 py-2 font-mono text-xs text-fg-secondary"
                  title={booking.qrCode}
                >
                  {booking.qrCode}
                </div>
              </div>
              <Button size="lg" fullWidth iconLeft={copiedPix ? Check : Copy} onClick={handleCopyPix}>
                {copiedPix ? 'Copiado!' : 'Copiar código PIX'}
              </Button>
              <p className="m-0 inline-flex items-center gap-1.5 text-xs text-fg-tertiary">
                <ShieldCheck size={14} strokeWidth={1.75} aria-hidden="true" />
                Pagamento processado pelo Mercado Pago
              </p>
            </>
          ) : (
            <p className="m-0 text-sm text-fg-secondary">QR code não disponível.</p>
          )}
        </section>
      )}

      {/* ── CONFIRMED section ── */}
      {booking.status === 'CONFIRMED' && (
        <div className="flex flex-col gap-3">
          {whatsappUrl ? (
            <Button href={whatsappUrl} target="_blank" variant="secondary" fullWidth iconLeft={MessageCircle}>
              Falar com o guia via WhatsApp
            </Button>
          ) : (
            <p className="m-0 text-center text-sm text-fg-secondary">
              Precisa de ajuda? Entre em contato com a operadora.
            </p>
          )}
          <Button href={calendarUrl} target="_blank" variant="secondary" fullWidth iconLeft={CalendarPlus}>
            Adicionar à agenda
          </Button>
        </div>
      )}

      {/* ── EXPIRED section ── */}
      {booking.status === 'EXPIRED' && (
        <>
          <Alert tone="warning" title="Prazo expirado">
            Seu prazo de pagamento expirou. Gere um novo QR code para concluir sua reserva.
          </Alert>
          <Button size="lg" fullWidth iconLeft={RotateCcw} onClick={handleRepay}>
            Gerar novo pagamento
          </Button>
        </>
      )}

      {/* ── CANCELLED section ── */}
      {booking.status === 'CANCELLED' && (
        <>
          <Alert tone="danger" title="Reserva cancelada">
            Dúvidas? Entre em contato:
          </Alert>
          {whatsappUrl ? (
            <Button href={whatsappUrl} target="_blank" variant="secondary" fullWidth iconLeft={MessageCircle}>
              Suporte via WhatsApp
            </Button>
          ) : (
            <p className="m-0 text-sm text-fg-secondary">
              Entre em contato com o suporte da operadora.
            </p>
          )}
        </>
      )}

      {/* Cancelar (pendente ou confirmada) */}
      {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
        <Button
          variant="ghost"
          fullWidth
          iconLeft={XCircle}
          onClick={() => setShowCancelModal(true)}
          style={{ color: 'var(--danger)' }}
        >
          Cancelar reserva
        </Button>
      )}

      {/* Nova consulta */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          iconLeft={ArrowLeft}
          onClick={() => { setUiState('LOOKUP'); setBooking(null) }}
        >
          Nova consulta
        </Button>
      </div>

      <CancelDialog
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        onConfirm={handleCancelConfirm}
        loading={cancelLoading}
      />
    </div>
  )
}
