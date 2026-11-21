'use client'

import { useState } from 'react'
import BookingCard, { type BookingCardData } from '@/src/components/turista/BookingCard'
import EmptyState from '@/src/components/turista/EmptyState'
import { apiClient } from '@/src/lib/api-client'

type Tab = 'upcoming' | 'past'

type Props = { initialBookings: BookingCardData[] }

export default function ViagensClient({ initialBookings }: Props) {
  const [tab, setTab] = useState<Tab>('upcoming')
  const [bookings, setBookings] = useState<BookingCardData[]>(initialBookings)
  const [loading, setLoading] = useState(false)

  async function switchTab(next: Tab) {
    if (next === tab) return
    setTab(next)
    setLoading(true)
    try {
      const { ok, data } = await apiClient<{ data?: BookingCardData[] }>(
        `/me/bookings?status=${next}&limit=20`,
      )
      if (ok) {
        setBookings(data?.data ?? [])
      } else {
        setBookings([])
      }
    } catch {
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = !loading && bookings.length === 0

  return (
    <>
      <style>{`
        .viagens-tabs {
          display: flex;
          gap: 0;
          border-bottom: 1px solid var(--border);
          margin-bottom: var(--space-6, 24px);
        }
        .viagens-tabs__btn {
          padding: 10px 16px;
          font-size: var(--text-sm);
          font-weight: 600;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s;
          margin-bottom: -1px;
        }
        .viagens-tabs__btn[aria-selected="true"] {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }
        .viagens-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3, 12px);
        }
        .viagens-loading {
          display: flex;
          justify-content: center;
          padding: var(--space-10, 40px) 0;
          color: var(--text-secondary);
          font-size: var(--text-sm);
        }
      `}</style>

      <div className="viagens-tabs" role="tablist">
        <button
          role="tab"
          className="viagens-tabs__btn"
          aria-selected={tab === 'upcoming'}
          onClick={() => switchTab('upcoming')}
        >
          Próximas
        </button>
        <button
          role="tab"
          className="viagens-tabs__btn"
          aria-selected={tab === 'past'}
          onClick={() => switchTab('past')}
        >
          Passadas
        </button>
      </div>

      {loading ? (
        <div className="viagens-loading" aria-live="polite">
          Carregando…
        </div>
      ) : isEmpty ? (
        <EmptyState
          title={tab === 'upcoming' ? 'Nenhuma viagem próxima' : 'Nenhuma viagem passada'}
          description={
            tab === 'upcoming'
              ? 'Suas próximas reservas aparecerão aqui.'
              : 'Suas viagens concluídas aparecerão aqui.'
          }
          ctaLabel={tab === 'upcoming' ? 'Explorar roteiros' : undefined}
          ctaHref={tab === 'upcoming' ? '/' : undefined}
        />
      ) : (
        <div className="viagens-list">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </>
  )
}
