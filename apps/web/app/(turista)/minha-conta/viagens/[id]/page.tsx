'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import QRCode from 'react-qr-code'
import { MapPin, User } from 'lucide-react'
import BookingStatusBadge from '@/src/components/turista/BookingStatusBadge'
import ReviewForm from '@/src/components/turista/ReviewForm'
import { apiClient } from '@/src/lib/api-client'

type BookingDetail = {
  id: string
  code: string
  status: string
  pax: number
  startsAt: string
  hasReview: boolean
  packageName: string
  coverImageUrl?: string | null
  durationHours?: number | null
  difficulty?: string | null
  meetingPointName?: string | null
  // Formato da API (GET /me/bookings/:id)
  conductor?: { name: string; photoUrl: string | null } | null
  tenantName: string
  qrCode?: string | null
  paymentUrl?: string | null
  expiresAt?: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function ViagemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewed, setReviewed] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    apiClient<BookingDetail>(`/me/bookings/${id}`)
      .then(({ ok, data }) => {
        if (!ok || !data) throw new Error('not_found')
        setBooking(data)
      })
      .catch(() => setError('Reserva não encontrada.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Carregando…
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--danger, #991b1b)' }}>
        {error ?? 'Reserva não encontrada.'}
      </div>
    )
  }

  // Check-in usa o código da reserva; o qrCode da API é o PIX (só serve para pagar)
  const showCheckin = booking.status === 'CONFIRMED'
  const showPix =
    booking.status === 'PENDING' &&
    !!booking.qrCode &&
    (!booking.expiresAt || new Date(booking.expiresAt).getTime() > Date.now())
  const guide = booking.conductor ?? null
  const showReview = booking.status === 'COMPLETED' && !booking.hasReview && !reviewed

  return (
    <>
      <style>{`
        .vd {
          display: flex;
          flex-direction: column;
          gap: var(--space-6, 24px);
        }
        .vd__cover {
          width: 100%;
          height: 220px;
          border-radius: var(--radius-lg);
          object-fit: cover;
          background: var(--bg-muted);
        }
        .vd__cover-placeholder {
          width: 100%;
          height: 220px;
          border-radius: var(--radius-lg);
          background: var(--bg-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
        }
        .vd__header {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .vd__name {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }
        .vd__info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3, 12px);
        }
        .vd__info-cell {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 12px 14px;
        }
        .vd__info-label {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 2px;
        }
        .vd__info-value {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text);
        }
        .vd__section-title {
          font-size: var(--text-base);
          font-weight: 700;
          color: var(--text);
          margin: 0 0 var(--space-3, 12px);
        }
        .vd__guide {
          display: flex;
          align-items: center;
          gap: var(--space-3, 12px);
          padding: 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
        }
        .vd__guide-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          background: var(--bg-muted);
          flex-shrink: 0;
        }
        .vd__guide-avatar-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--primary-subtle, #e8f5e9);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }
        .vd__guide-name {
          font-size: var(--text-sm);
          font-weight: 700;
          color: var(--text);
        }
        .vd__guide-bio {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .vd__meeting {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
        .vd__qr {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3, 12px);
          padding: var(--space-6, 24px);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
        }
        .vd__qr-label {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          text-align: center;
        }
        .vd__review-box {
          padding: var(--space-5, 20px);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
        }
        .vd__back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          font-size: var(--text-sm, 14px);
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0;
        }
        .vd__back:hover { color: var(--text); }
      `}</style>

      <div className="vd">
        <button className="vd__back" onClick={() => router.back()} type="button">
          ← Voltar
        </button>

        {booking.coverImageUrl ? (
          <Image
            src={booking.coverImageUrl}
            alt={booking.packageName}
            width={800}
            height={220}
            className="vd__cover"
          />
        ) : (
          <div className="vd__cover-placeholder" aria-hidden="true">
            🗺️
          </div>
        )}

        <div className="vd__header">
          <h1 className="vd__name">{booking.packageName}</h1>
          <BookingStatusBadge status={booking.status} />
        </div>

        <div className="vd__info-grid">
          <div className="vd__info-cell">
            <div className="vd__info-label">Data</div>
            <div className="vd__info-value">{formatDate(booking.startsAt)}</div>
          </div>
          <div className="vd__info-cell">
            <div className="vd__info-label">Horário</div>
            <div className="vd__info-value">{formatTime(booking.startsAt)}</div>
          </div>
          {booking.durationHours != null && (
            <div className="vd__info-cell">
              <div className="vd__info-label">Duração</div>
              <div className="vd__info-value">{booking.durationHours}h</div>
            </div>
          )}
          <div className="vd__info-cell">
            <div className="vd__info-label">Pessoas</div>
            <div className="vd__info-value">{booking.pax}</div>
          </div>
          <div className="vd__info-cell">
            <div className="vd__info-label">Código</div>
            <div className="vd__info-value">{booking.code}</div>
          </div>
        </div>

        {guide && (
          <div>
            <h2 className="vd__section-title">Guia</h2>
            <div className="vd__guide">
              {guide.photoUrl ? (
                <Image
                  src={guide.photoUrl}
                  alt={guide.name}
                  width={48}
                  height={48}
                  className="vd__guide-avatar"
                />
              ) : (
                <div className="vd__guide-avatar-placeholder" aria-hidden="true">
                  <User size={20} />
                </div>
              )}
              <div>
                <div className="vd__guide-name">{guide.name}</div>
              </div>
            </div>
          </div>
        )}

        {booking.meetingPointName && (
          <div>
            <h2 className="vd__section-title">Ponto de encontro</h2>
            <div className="vd__meeting">
              <MapPin size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary)' }} />
              <span>{booking.meetingPointName}</span>
            </div>
          </div>
        )}

        {showPix && (
          <div className="vd__qr">
            <h2 className="vd__section-title" style={{ margin: 0 }}>
              Pague com PIX
            </h2>
            <QRCode value={booking.qrCode as string} size={160} />
            <p className="vd__qr-label">Escaneie no app do banco para confirmar a reserva</p>
            {booking.paymentUrl && (
              <a href={booking.paymentUrl} target="_blank" rel="noopener noreferrer">
                Pagar no Mercado Pago
              </a>
            )}
          </div>
        )}

        {showCheckin && (
          <div className="vd__qr">
            <h2 className="vd__section-title" style={{ margin: 0 }}>
              QR Code de check-in
            </h2>
            <QRCode value={booking.code} size={160} />
            <p className="vd__qr-label">Apresente ao guia no dia da atividade</p>
          </div>
        )}

        {showReview && (
          <div className="vd__review-box">
            <h2 className="vd__section-title">Avalie sua experiência</h2>
            <ReviewForm bookingId={booking.id} onSubmitted={() => setReviewed(true)} />
          </div>
        )}
      </div>
    </>
  )
}
