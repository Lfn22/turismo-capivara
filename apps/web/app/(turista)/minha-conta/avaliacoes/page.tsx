'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import EmptyState from '@/src/components/turista/EmptyState'
import { apiClient } from '@/src/lib/api-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

type Review = {
  id: string
  rating: number
  comment: string
  packageName: string
  packageCoverUrl?: string
  createdAt: string
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="avaliacoes-card__stars" aria-label={`${rating} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={16}
          fill={n <= rating ? '#f59e0b' : 'none'}
          color={n <= rating ? '#f59e0b' : '#d1d5db'}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

export default function AvaliacoesPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient<{ data: Review[] }>('/me/reviews')
      .then(({ ok, data }) => setReviews(ok ? (data?.data ?? []) : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <style>{`
        .avaliacoes-page__title {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--text);
          margin: 0 0 var(--space-6, 24px);
        }
        .avaliacoes-loading {
          color: var(--text-secondary);
          font-size: var(--text-sm);
          padding: var(--space-6, 24px) 0;
        }
        .avaliacoes-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3, 12px);
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .avaliacoes-card {
          display: flex;
          flex-direction: column;
          gap: var(--space-2, 8px);
          padding: var(--space-4, 16px);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--surface);
        }
        .avaliacoes-card__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-2, 8px);
        }
        .avaliacoes-card__package {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text);
          margin: 0;
        }
        .avaliacoes-card__date {
          font-size: var(--text-xs, 12px);
          color: var(--text-secondary);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .avaliacoes-card__stars {
          display: flex;
          gap: 2px;
        }
        .avaliacoes-card__comment {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }
      `}</style>

      <h1 className="avaliacoes-page__title">Minhas avaliações</h1>

      {loading && <p className="avaliacoes-loading">Carregando...</p>}

      {!loading && reviews.length === 0 && (
        <EmptyState
          title="Nenhuma avaliação"
          description="Você ainda não avaliou nenhuma viagem."
          ctaLabel="Ver viagens"
          ctaHref="/minha-conta/viagens"
        />
      )}

      {!loading && reviews.length > 0 && (
        <ul className="avaliacoes-list">
          {reviews.map((r) => (
            <li key={r.id}>
              <div className="avaliacoes-card">
                <div className="avaliacoes-card__header">
                  <p className="avaliacoes-card__package">{r.packageName}</p>
                  <span className="avaliacoes-card__date">
                    {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <StarDisplay rating={r.rating} />
                {r.comment && <p className="avaliacoes-card__comment">{r.comment}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
