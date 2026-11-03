'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { IconButton } from '@/src/components/ui/capi'

interface Props {
  photos: string[]
  guideName: string
}

export function PortfolioLightbox({ photos, guideName }: Props) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  const close = useCallback(() => setOpen(false), [])
  const prev = useCallback(() => setIndex((i) => (i - 1 + photos.length) % photos.length), [photos.length])
  const next = useCallback(() => setIndex((i) => (i + 1) % photos.length), [photos.length])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, close, prev, next])

  return (
    <>
      <style>{`
        .portfolio-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--space-2);
        }
        @media (min-width: 640px) {
          .portfolio-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--space-3); }
        }
        .portfolio-btn {
          display: block;
          position: relative;
          width: 100%;
          padding: 0;
          border: 0;
          background: var(--bg-muted);
          border-radius: var(--radius-md);
          overflow: hidden;
          cursor: pointer;
        }
        .portfolio-btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
        .portfolio-img {
          width: 100%;
          height: auto;
          aspect-ratio: 1 / 1;
          object-fit: cover;
          display: block;
          transition: transform .5s cubic-bezier(.16, 1, .3, 1);
        }
        .portfolio-btn:hover .portfolio-img { transform: scale(1.04); }
        .lightbox {
          position: fixed;
          inset: 0;
          z-index: var(--z-overlay);
          background: var(--overlay);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
        }
        .lightbox__content {
          position: relative;
          width: min(92vw, 84dvh);
          max-width: 1000px;
          aspect-ratio: 1 / 1;
        }
        .lightbox__close {
          position: fixed;
          top: calc(var(--space-4) + env(safe-area-inset-top, 0px));
          right: var(--space-4);
        }
        .lightbox__nav {
          position: fixed;
          top: 50%;
          transform: translateY(-50%);
        }
        .lightbox__nav--prev { left: var(--space-4); }
        .lightbox__nav--next { right: var(--space-4); }
        @media (max-width: 639px) {
          .lightbox__nav { top: auto; bottom: calc(var(--space-6) + env(safe-area-inset-bottom, 0px)); transform: none; }
        }
        .lightbox__counter {
          position: fixed;
          bottom: calc(var(--space-6) + env(safe-area-inset-bottom, 0px));
          left: 50%;
          transform: translateX(-50%);
          display: inline-flex;
          align-items: center;
          min-height: 32px;
          padding: 0 var(--space-3);
          border-radius: var(--radius-pill);
          background: var(--glass);
          color: var(--text);
          font-size: 14px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        @media (prefers-reduced-motion: reduce) {
          .portfolio-img { transition: none; }
          .portfolio-btn:hover .portfolio-img { transform: none; }
        }
      `}</style>

      <div className="portfolio-grid">
        {photos.map((url, i) => (
          <button
            key={url}
            type="button"
            className="portfolio-btn"
            onClick={() => { setIndex(i); setOpen(true) }}
            aria-label={`Abrir foto ${i + 1} do portfólio de ${guideName}`}
          >
            <Image
              src={url}
              alt={`Foto ${i + 1} do portfólio de ${guideName}`}
              width={400}
              height={400}
              className="portfolio-img"
            />
          </button>
        ))}
      </div>

      {open && (
        <div
          className="lightbox"
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
          role="dialog"
          aria-modal="true"
          aria-label="Visualizador de fotos"
        >
          <div className="lightbox__content">
            <Image
              src={photos[index]}
              alt={`Foto ${index + 1} de ${photos.length} — ${guideName}`}
              fill
              style={{ objectFit: 'contain' }}
              sizes="min(92vw, 1000px)"
            />
          </div>

          <IconButton icon={X} label="Fechar" variant="glass" className="lightbox__close" onClick={close} />

          {photos.length > 1 && (
            <>
              <IconButton
                icon={ChevronLeft}
                label="Foto anterior"
                variant="glass"
                className="lightbox__nav lightbox__nav--prev"
                onClick={prev}
              />
              <IconButton
                icon={ChevronRight}
                label="Próxima foto"
                variant="glass"
                className="lightbox__nav lightbox__nav--next"
                onClick={next}
              />
              <div className="lightbox__counter" aria-live="polite">{index + 1} / {photos.length}</div>
            </>
          )}
        </div>
      )}
    </>
  )
}
