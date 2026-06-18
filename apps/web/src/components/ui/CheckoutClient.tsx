'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--stone-500)' }}>
        <p>Parâmetros inválidos. Volte ao roteiro e tente novamente.</p>
        <a href={`/${slug}/roteiros`} style={{ color: 'var(--ochre)', textDecoration: 'none', fontWeight: 600 }}>
          Ver roteiros
        </a>
      </div>
    )
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50dvh',
          gap: '1rem',
          color: 'var(--stone-500)',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid var(--stone-200)',
            borderTopColor: 'var(--ochre)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ margin: 0, fontSize: '0.95rem' }}>Carregando reserva…</p>
  {/* spin defined in global styles block below */}
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p style={{ color: '#991b1b', marginBottom: '1rem' }}>{error ?? 'Reserva não encontrada.'}</p>
        <a href={`/${slug}/roteiros`} style={{ color: 'var(--ochre)', textDecoration: 'none', fontWeight: 600 }}>
          ← Ver roteiros
        </a>
      </div>
    )
  }

  const isSuccess = booking.status === 'CONFIRMED' || booking.status === 'COMPLETED'
  const isCancelled = booking.status === 'CANCELLED'
  const isPending = booking.status === 'PENDING'
  const isExpired = countdown !== null && countdown === 0 && isPending

  const packageName = booking.slot?.package?.name ?? 'Roteiro'
  const slotDate = booking.slot?.startsAt

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      <div
        style={{
          maxWidth: '480px',
          margin: '0 auto',
          padding: 'clamp(1.5rem, 5vw, 3rem) clamp(1rem, 4vw, 1.5rem)',
          animation: 'fadeIn 0.4s ease',
        }}
      >
        {/* Status banner */}
        <div
          style={{
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
            backgroundColor: isSuccess ? '#f0fdf4' : isCancelled || isExpired ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${isSuccess ? '#bbf7d0' : isCancelled || isExpired ? '#fecaca' : '#fde68a'}`,
          }}
        >
          {/* Icon */}
          <div style={{ marginBottom: '0.5rem', fontSize: '1.75rem' }}>
            {isSuccess ? '✓' : isCancelled || isExpired ? '✕' : (
              <div
                style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  border: '3px solid #fde68a',
                  borderTopColor: '#d97706',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            )}
          </div>

          <p
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 700,
              color: isSuccess ? '#166534' : isCancelled || isExpired ? '#991b1b' : '#92400e',
            }}
          >
            {isExpired ? 'PIX expirado' : STATUS_LABELS[booking.status] ?? booking.status}
          </p>

          {isPending && !isExpired && countdown !== null && (
            <p style={{ margin: '0.375rem 0 0', fontSize: '0.8rem', color: '#92400e' }}>
              Expira em {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
            </p>
          )}

          {isSuccess && (
            <p style={{ margin: '0.375rem 0 0', fontSize: '0.8rem', color: '#166534' }}>
              Redirecionando para confirmação…
            </p>
          )}
        </div>

        {/* Booking summary */}
        <div
          style={{
            backgroundColor: 'var(--stone-50)',
            border: '1px solid var(--stone-200)',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--stone-100)' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--stone-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Resumo da reserva
            </p>
          </div>
          <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <Row label="Roteiro" value={packageName} />
            {slotDate && <Row label="Data" value={formatDateBR(slotDate)} />}
            <Row label="Pessoas" value={`${booking.pax} pessoa${booking.pax !== 1 ? 's' : ''}`} />
            <Row
              label="N° reserva"
              value={booking.id.slice(0, 8).toUpperCase()}
              valueStyle={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
            />
          </div>
        </div>

        {/* PIX section — only if pending and not expired */}
        {isPending && !isExpired && booking.qrCode && (
          <div
            style={{
              backgroundColor: 'var(--stone-50)',
              border: '1px solid var(--stone-200)',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--stone-100)' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--stone-900)' }}>
                Pague via PIX
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--stone-500)' }}>
                Copie o código abaixo e cole no app do seu banco
              </p>
            </div>
            <div style={{ padding: '1rem 1.25rem' }}>
              {/* PIX code display */}
              <div
                style={{
                  backgroundColor: 'var(--stone-50)',
                  border: '1px solid var(--stone-200)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                  color: 'var(--stone-700)',
                  wordBreak: 'break-all',
                  lineHeight: 1.6,
                  marginBottom: '0.75rem',
                  maxHeight: '80px',
                  overflowY: 'auto',
                }}
              >
                {booking.qrCode}
              </div>

              <button
                onClick={handleCopy}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: copied ? '#166534' : 'var(--ochre)',
                  color: 'var(--stone-50)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {copied ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Código copiado!
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copiar código PIX
                  </>
                )}
              </button>

              {/* External payment link */}
              {booking.paymentUrl && (
                <a
                  href={booking.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    marginTop: '0.75rem',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    color: 'var(--stone-500)',
                    textDecoration: 'none',
                    padding: '0.5rem',
                    border: '1px solid var(--stone-200)',
                    borderRadius: '8px',
                  }}
                >
                  Abrir página de pagamento →
                </a>
              )}

              <p
                style={{
                  margin: '0.75rem 0 0',
                  fontSize: '0.75rem',
                  color: 'var(--stone-400)',
                  textAlign: 'center',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              >
                Aguardando confirmação do pagamento…
              </p>
            </div>
          </div>
        )}

        {/* Expired state */}
        {isExpired && (
          <div style={{ textAlign: 'center', padding: '0.5rem 0 1.5rem' }}>
            <a
              href={`/${slug}/roteiros`}
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--ochre)',
                color: 'var(--stone-50)',
                textDecoration: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.95rem',
              }}
            >
              Tentar novamente
            </a>
          </div>
        )}
      </div>
    </>
  )
}

function Row({
  label,
  value,
  valueStyle,
}: {
  label: string
  value: string
  valueStyle?: React.CSSProperties
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--stone-500)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.875rem', color: 'var(--stone-900)', textAlign: 'right', ...valueStyle }}>
        {value}
      </span>
    </div>
  )
}
