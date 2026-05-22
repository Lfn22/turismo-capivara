'use client'

import { useState, useCallback } from 'react'
import QRCode from 'react-qr-code'

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

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:   { bg: '#FEF9EC', color: '#B45309', label: 'Aguardando pagamento' },
  CONFIRMED: { bg: '#F0FDF4', color: '#15803D', label: 'Confirmada' },
  EXPIRED:   { bg: '#FFF7ED', color: '#C2410C', label: 'Tempo esgotado' },
  CANCELLED: { bg: '#FEF2F2', color: '#DC2626', label: 'Cancelada' },
}

const OCHRE = '#C4852A'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

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
      const res = await fetch(`${API_URL}/tenants/${slug}/bookings/lookup`, {
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
      const res = await fetch(`${API_URL}/tenants/${slug}/bookings/cancel-self`, {
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
      const res = await fetch(`${API_URL}/tenants/${slug}/bookings/repay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim().toLowerCase() }),
      })
      const data = await res.json()
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

  const containerStyle: React.CSSProperties = {
    minHeight: '100dvh',
    padding: 'clamp(1.5rem, 5vw, 3rem) clamp(1rem, 4vw, 1.5rem)',
    fontFamily: 'var(--font-source-sans-3, sans-serif)',
    backgroundColor: '#FAFAF9',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  }

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '520px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: 'clamp(1.5rem, 5vw, 2.5rem)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  }

  const displayHeadingStyle: React.CSSProperties = {
    fontFamily: 'var(--font-playfair, serif)',
    fontSize: 'clamp(22px, 6vw, 28px)',
    fontWeight: 700,
    color: '#1C1917',
    marginBottom: '0.5rem',
    marginTop: 0,
  }

  const headingStyle: React.CSSProperties = {
    fontFamily: 'var(--font-playfair, serif)',
    fontSize: '20px',
    fontWeight: 700,
    color: '#1C1917',
    marginBottom: 0,
    marginTop: 0,
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '16px',
    fontWeight: 700,
    marginBottom: '0.5rem',
    color: '#1C1917',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #D6D3D1',
    fontSize: '16px',
    fontWeight: 400,
    outline: 'none',
    boxSizing: 'border-box',
    minHeight: '44px',
    backgroundColor: '#FFFFFF',
    color: '#1C1917',
  }

  const primaryButtonStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: OCHRE,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    minHeight: '44px',
    marginTop: '1rem',
  }

  const cancelButtonStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'transparent',
    color: '#DC2626',
    border: '1px solid #DC2626',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    minHeight: '44px',
    marginTop: '0.75rem',
  }

  const dividerStyle: React.CSSProperties = {
    borderBottom: '1px solid #F5F5F4',
    paddingBottom: '1rem',
    marginBottom: '1rem',
  }

  // ── LOOKUP state ──────────────────────────────────────────────────────────
  if (uiState === 'LOOKUP') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={displayHeadingStyle}>Minha Reserva</h1>
          <p style={{ fontSize: '14px', color: '#78716C', marginBottom: '1.5rem', marginTop: 0 }}>
            Digite seu e-mail e o código da reserva para consultar o status.
          </p>
          <form onSubmit={handleLookup}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle} htmlFor="mr-email">E-mail</label>
              <input
                id="mr-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                style={inputStyle}
                autoComplete="email"
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle} htmlFor="mr-code">Código da reserva</label>
              <input
                id="mr-code"
                type="text"
                required
                maxLength={6}
                minLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: A1B2C3"
                style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.15em' }}
                autoComplete="off"
                inputMode="text"
                autoCapitalize="characters"
                aria-describedby="mr-code-hint"
              />
              <p id="mr-code-hint" style={{ fontSize: '12px', color: '#A8A29E', marginTop: '0.25rem', marginBottom: 0 }}>
                Últimos 6 caracteres do código enviado por e-mail
              </p>
            </div>
            <button type="submit" style={primaryButtonStyle}>
              Consultar Reserva
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── LOADING state ─────────────────────────────────────────────────────────
  if (uiState === 'LOADING') {
    return (
      <div style={{ ...containerStyle, justifyContent: 'center' }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              style={{ animation: 'spin 0.8s linear infinite' }}
              aria-label="Carregando"
              role="img"
            >
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              <circle cx="20" cy="20" r="16" fill="none" stroke="#E7E5E4" strokeWidth="4" />
              <path d="M20 4 A16 16 0 0 1 36 20" fill="none" stroke={OCHRE} strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <p style={{ textAlign: 'center', fontSize: '14px', color: '#78716C', margin: 0 }}>
            Consultando sua reserva...
          </p>
        </div>
      </div>
    )
  }

  // ── ERROR state ───────────────────────────────────────────────────────────
  if (uiState === 'ERROR') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={displayHeadingStyle}>Minha Reserva</h1>
          <div
            role="alert"
            style={{ backgroundColor: '#FEF2F2', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}
          >
            <p style={{ fontSize: '14px', color: '#DC2626', margin: 0 }}>{errorMsg}</p>
          </div>
          <button onClick={() => setUiState('LOOKUP')} style={{ ...primaryButtonStyle, marginTop: 0 }}>
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  // ── RESULT state ──────────────────────────────────────────────────────────
  if (!booking) return null

  const statusStyle = STATUS_STYLES[booking.status] ?? STATUS_STYLES.CANCELLED
  const formattedDate = new Date(booking.slot.startsAt).toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const whatsappUrl = booking.tenantWhatsapp
    ? `https://wa.me/${booking.tenantWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, tenho uma reserva: #${booking.id.slice(-6).toUpperCase()}`)}`
    : null

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header: title + status badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '0.75rem' }}>
          <h1 style={headingStyle}>Minha Reserva</h1>
          <span
            style={{
              backgroundColor: statusStyle.bg,
              color: statusStyle.color,
              borderRadius: '9999px',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              flexShrink: 0,
            }}
            aria-label={`Status: ${statusStyle.label}`}
          >
            {statusStyle.label}
          </span>
        </div>

        {/* Detail rows */}
        <div style={dividerStyle}>
          <p style={{ fontSize: '14px', color: '#78716C', margin: '0 0 0.25rem' }}>Roteiro</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#1C1917', margin: 0 }}>{booking.slot.packageName}</p>
        </div>
        <div style={dividerStyle}>
          <p style={{ fontSize: '14px', color: '#78716C', margin: '0 0 0.25rem' }}>Data</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#1C1917', margin: 0 }}>{formattedDate}</p>
        </div>
        <div style={{ ...dividerStyle, marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '14px', color: '#78716C', margin: '0 0 0.25rem' }}>Pessoas</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#1C1917', margin: 0 }}>
            {booking.pax} {booking.pax === 1 ? 'pessoa' : 'pessoas'}
          </p>
        </div>

        {/* ── PENDING section ── */}
        {booking.status === 'PENDING' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '14px', color: '#78716C', marginBottom: '1rem', marginTop: 0 }}>
              Escaneie o QR code com o app do seu banco ou copie a chave PIX abaixo.
            </p>
            {booking.qrCode ? (
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '16px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E7E5E4',
                }}>
                  <QRCode
                    value={booking.qrCode}
                    size={Math.min(200, typeof window !== 'undefined' ? window.innerWidth * 0.8 : 200)}
                    style={{ height: 'auto', maxWidth: '100%', width: 'min(200px, 80vw)' }}
                    aria-label="QR code PIX para pagamento da reserva"
                  />
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ fontSize: '14px', color: '#78716C', marginBottom: '0.5rem', marginTop: 0 }}>
                    Chave PIX (copia e cola):
                  </p>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: '#44403C',
                      backgroundColor: '#F5F5F4',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      maxWidth: '100%',
                    }}
                    onClick={handleCopyPix}
                    title={booking.qrCode}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleCopyPix()}
                    aria-label="Copiar código PIX"
                  >
                    {booking.qrCode}
                  </div>
                  <button
                    onClick={handleCopyPix}
                    style={{
                      ...primaryButtonStyle,
                      backgroundColor: copiedPix ? '#15803D' : OCHRE,
                      marginTop: '0.5rem',
                    }}
                  >
                    {copiedPix ? 'Copiado!' : 'Copiar chave PIX'}
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '14px', color: '#78716C' }}>QR code não disponível.</p>
            )}
            <button onClick={() => setShowCancelModal(true)} style={cancelButtonStyle}>
              Cancelar reserva
            </button>
          </div>
        )}

        {/* ── CONFIRMED section ── */}
        {booking.status === 'CONFIRMED' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: '#F0FDF4', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '14px', color: '#15803D', margin: 0, fontWeight: 700 }}>
                Reserva confirmada! Seu guia entrará em contato.
              </p>
            </div>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  backgroundColor: '#25D366',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '16px',
                  textDecoration: 'none',
                  marginBottom: '0.75rem',
                  minHeight: '44px',
                  lineHeight: '20px',
                }}
              >
                Falar com o guia via WhatsApp
              </a>
            ) : (
              <p style={{ fontSize: '14px', color: '#78716C', marginBottom: '0.75rem' }}>
                Precisa de ajuda? Entre em contato com a operadora.
              </p>
            )}
            <button onClick={() => setShowCancelModal(true)} style={cancelButtonStyle}>
              Cancelar reserva
            </button>
          </div>
        )}

        {/* ── EXPIRED section ── */}
        {booking.status === 'EXPIRED' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: '#FFF7ED', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '14px', color: '#C2410C', margin: 0, fontWeight: 700 }}>Prazo expirado</p>
              <p style={{ fontSize: '14px', color: '#C2410C', margin: '0.25rem 0 0' }}>
                Seu prazo de pagamento expirou. Gere um novo QR code para concluir sua reserva.
              </p>
            </div>
            <button onClick={handleRepay} style={{ ...primaryButtonStyle, marginTop: 0 }}>
              Gerar novo pagamento
            </button>
          </div>
        )}

        {/* ── CANCELLED section ── */}
        {booking.status === 'CANCELLED' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: '#FEF2F2', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '14px', color: '#DC2626', margin: 0, fontWeight: 700 }}>Reserva cancelada</p>
              <p style={{ fontSize: '14px', color: '#DC2626', margin: '0.25rem 0 0' }}>
                Dúvidas? Entre em contato:
              </p>
            </div>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid #25D366',
                  backgroundColor: 'transparent',
                  color: '#15803D',
                  fontWeight: 700,
                  fontSize: '16px',
                  textDecoration: 'none',
                  minHeight: '44px',
                  lineHeight: '20px',
                }}
              >
                Suporte via WhatsApp
              </a>
            ) : (
              <p style={{ fontSize: '14px', color: '#78716C' }}>
                Entre em contato com o suporte da operadora.
              </p>
            )}
          </div>
        )}

        {/* Back to lookup */}
        <button
          onClick={() => { setUiState('LOOKUP'); setBooking(null) }}
          style={{
            fontSize: '14px',
            color: '#78716C',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem 0',
            marginTop: '0.5rem',
          }}
        >
          ← Nova consulta
        </button>
      </div>

      {/* ── Cancel confirmation modal ── */}
      {showCancelModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(31,14,8,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: 'clamp(1.5rem, 5vw, 2rem)',
              width: '100%',
              maxWidth: '480px',
            }}
          >
            <h2
              id="cancel-modal-title"
              style={{ fontFamily: 'var(--font-playfair, serif)', fontSize: '20px', fontWeight: 700, marginBottom: '1rem', color: '#1C1917', marginTop: 0 }}
            >
              Cancelar reserva
            </h2>
            <p style={{ fontSize: '14px', color: '#78716C', marginBottom: '1.5rem' }}>
              Tem certeza que deseja cancelar esta reserva? Esta ação não pode ser desfeita.
            </p>
            {/* Mobile: destructive first (thumb reach); Desktop: back left, destructive right */}
            <button
              onClick={handleCancelConfirm}
              disabled={cancelLoading}
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 700,
                cursor: cancelLoading ? 'not-allowed' : 'pointer',
                minHeight: '44px',
                opacity: cancelLoading ? 0.7 : 1,
              }}
            >
              {cancelLoading ? 'Cancelando...' : 'Sim, cancelar reserva'}
            </button>
            <button
              onClick={() => setShowCancelModal(false)}
              disabled={cancelLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #D6D3D1',
                backgroundColor: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 700,
                cursor: cancelLoading ? 'not-allowed' : 'pointer',
                minHeight: '44px',
                marginTop: '0.5rem',
                color: '#1C1917',
              }}
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
