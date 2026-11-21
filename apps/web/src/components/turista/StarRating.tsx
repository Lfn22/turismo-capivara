'use client'

import { Star } from 'lucide-react'

type Props = {
  value: number
  onChange: (n: number) => void
  disabled?: boolean
}

export default function StarRating({ value, onChange, disabled = false }: Props) {
  return (
    <>
      <style>{`
        .star-rating {
          display: flex;
          gap: 4px;
        }
        .star-rating__btn {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          line-height: 0;
          transition: transform 0.1s var(--ease-spring, ease);
        }
        .star-rating__btn:hover:not(:disabled) {
          transform: scale(1.15);
        }
        .star-rating__btn:disabled {
          cursor: default;
        }
      `}</style>
      <div className="star-rating" role="group" aria-label="Avaliação em estrelas">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= value
          const label = n === 1 ? '1 estrela' : `${n} estrelas`
          return (
            <button
              key={n}
              type="button"
              className="star-rating__btn"
              aria-label={label}
              aria-pressed={filled}
              disabled={disabled}
              onClick={() => onChange(n)}
            >
              <Star
                size={24}
                fill={filled ? '#f59e0b' : 'none'}
                color={filled ? '#f59e0b' : '#d1d5db'}
                strokeWidth={1.5}
              />
            </button>
          )
        })}
      </div>
    </>
  )
}
