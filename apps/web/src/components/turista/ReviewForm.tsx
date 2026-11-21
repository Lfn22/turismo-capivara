'use client'

import { useState } from 'react'
import StarRating from './StarRating'
import { apiClient } from '@/src/lib/api-client'

type Props = {
  bookingId: string
  onSubmitted: () => void
}

export default function ReviewForm({ bookingId, onSubmitted }: Props) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) {
      setError('Selecione uma nota')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { ok, data } = await apiClient<{ message?: string }>('/me/reviews', {
        method: 'POST',
        body: { bookingId, rating, comment: comment || undefined },
      })
      if (!ok) {
        setError(data?.message ?? 'Erro ao enviar avaliação.')
        return
      }
      onSubmitted()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .review-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-4, 16px);
        }
        .review-form__label {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text, #1c1916);
          margin-bottom: 6px;
          display: block;
        }
        .review-form__textarea {
          width: 100%;
          min-height: 88px;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-size: var(--text-sm);
          font-family: inherit;
          resize: vertical;
          box-sizing: border-box;
        }
        .review-form__textarea:focus {
          outline: 2px solid var(--primary);
          outline-offset: 1px;
        }
        .review-form__error {
          font-size: var(--text-sm);
          color: var(--danger, #991b1b);
        }
        .review-form__submit {
          align-self: flex-start;
          padding: 10px 20px;
          border-radius: var(--radius-md);
          background: var(--primary);
          color: var(--on-primary, #fff);
          font-size: var(--text-sm);
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .review-form__submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
      <form className="review-form" onSubmit={handleSubmit}>
        <div>
          <span className="review-form__label">Sua nota</span>
          <StarRating value={rating} onChange={setRating} disabled={loading} />
        </div>
        <div>
          <label className="review-form__label" htmlFor="review-comment">
            Comentário{' '}
            <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(opcional)</span>
          </label>
          <textarea
            id="review-comment"
            className="review-form__textarea"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            disabled={loading}
            placeholder="Conte como foi a experiência…"
          />
        </div>
        {error && (
          <p className="review-form__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="review-form__submit" disabled={loading}>
          {loading ? 'Enviando…' : 'Enviar avaliação'}
        </button>
      </form>
    </>
  )
}
