'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

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
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        .portfolio-btn {
          all: unset;
          cursor: pointer;
          display: block;
          position: relative;
        }
        .portfolio-img {
          width: 100%;
          aspect-ratio: 1/1;
          object-fit: cover;
          border-radius: 6px;
          transition: opacity 0.15s;
          display: block;
        }
        .portfolio-btn:hover .portfolio-img { opacity: 0.85; }
        .lightbox {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0,0,0,0.92);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lightbox__content {
          position: relative;
          width: min(90vw, 88vh);
          max-width: 1000px;
          max-height: 1000px;
          aspect-ratio: 1/1;
        }
        .lightbox__close {
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(255,255,255,0.15);
          border: none;
          color: #fff;
          font-size: 24px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .lightbox__close:hover { background: rgba(255,255,255,0.25); }
        .lightbox__nav {
          position: fixed;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255,255,255,0.15);
          border: none;
          color: #fff;
          font-size: 28px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lightbox__nav:hover { background: rgba(255,255,255,0.25); }
        .lightbox__nav--prev { left: 20px; }
        .lightbox__nav--next { right: 20px; }
        .lightbox__counter {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          color: rgba(255,255,255,0.7);
          font-size: 14px;
          font-weight: 500;
        }
        @media (max-width: 480px) {
          .portfolio-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="portfolio-grid">
        {photos.map((url, i) => (
          <button
            key={url}
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
              sizes="min(90vw, 1000px)"
            />
          </div>

          <button className="lightbox__close" onClick={close} aria-label="Fechar">✕</button>

          {photos.length > 1 && (
            <>
              <button className="lightbox__nav lightbox__nav--prev" onClick={prev} aria-label="Foto anterior">‹</button>
              <button className="lightbox__nav lightbox__nav--next" onClick={next} aria-label="Próxima foto">›</button>
              <div className="lightbox__counter">{index + 1} / {photos.length}</div>
            </>
          )}
        </div>
      )}
    </>
  )
}
