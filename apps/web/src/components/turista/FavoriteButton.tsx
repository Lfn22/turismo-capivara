'use client'

import { Heart } from 'lucide-react'

type Props = {
  packageId?: string
  destinationId?: string
  isFavorite: boolean
  onToggle: () => void
  size?: number
}

export default function FavoriteButton({ isFavorite, onToggle, size = 20 }: Props) {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    onToggle()
  }

  return (
    <>
      <style>{`
        .fav-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          padding: var(--space-1, 4px);
          cursor: pointer;
          border-radius: var(--radius-pill, 9999px);
          transition: transform 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .fav-btn:hover {
          transform: scale(1.15);
        }
        .fav-btn:focus-visible {
          outline: 2px solid var(--focus-ring, #3b82f6);
          outline-offset: 2px;
        }
        .fav-btn:active {
          transform: scale(0.95);
        }
      `}</style>
      <button
        type="button"
        className="fav-btn"
        aria-label={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
        aria-pressed={isFavorite}
        onClick={handleClick}
      >
        <Heart
          size={size}
          fill={isFavorite ? '#ef4444' : 'none'}
          color={isFavorite ? '#ef4444' : '#9ca3af'}
          strokeWidth={2}
        />
      </button>
    </>
  )
}
