'use client'

import Image from 'next/image'
import Link from 'next/link'

export interface MapInfoCardData {
  id: string
  name: string
  imageUrl?: string | null
  price?: number | null
  duration?: string | null
  subtitle?: string | null
  href: string
  badge?: string | null
}

interface MapInfoCardProps {
  data: MapInfoCardData
  onClose?: () => void
}

export default function MapInfoCard({ data, onClose }: MapInfoCardProps) {
  return (
    <div className="map-info-card">
      {data.imageUrl && (
        <div className="map-info-card__img">
          <Image
            src={data.imageUrl}
            alt={data.name}
            fill
            sizes="220px"
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}
      <div className="map-info-card__body">
        <h3 className="map-info-card__title">{data.name}</h3>
        {data.subtitle && <p className="map-info-card__sub">{data.subtitle}</p>}
        <div className="map-info-card__meta">
          {data.price != null && (
            <span className="map-info-card__price">
              {data.price.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0,
              })}
            </span>
          )}
          {data.duration && <span className="map-info-card__dur">{data.duration}</span>}
          {data.badge && <span className="map-info-card__badge">{data.badge}</span>}
        </div>
        <Link href={data.href} className="map-info-card__cta">
          Ver detalhes
        </Link>
      </div>
      {onClose && (
        <button
          type="button"
          className="map-info-card__close"
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>
      )}
    </div>
  )
}

export const mapInfoCardStyles = `
  .map-info-card {
    position: relative;
    width: 220px;
    background: var(--bg-surface, #fff);
    border-radius: var(--radius-md, 8px);
    overflow: hidden;
    font-family: var(--font-sans);
    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  }
  .map-info-card__img {
    position: relative;
    width: 100%;
    height: 130px;
  }
  .map-info-card__body {
    padding: 10px 12px 12px;
  }
  .map-info-card__title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.3;
    color: var(--fg);
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .map-info-card__sub {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.3;
  }
  .map-info-card__meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  .map-info-card__price {
    font-weight: 700;
    color: var(--primary);
    font-size: 14px;
  }
  .map-info-card__dur {
    color: var(--text-tertiary);
  }
  .map-info-card__badge {
    padding: 1px 6px;
    border-radius: 10px;
    background: var(--bg-muted);
    font-size: 11px;
    font-weight: 600;
  }
  .map-info-card__cta {
    display: block;
    margin-top: 8px;
    padding: 6px 0;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    color: var(--primary);
    text-decoration: none;
    border-top: 1px solid var(--border);
  }
  .map-info-card__cta:hover {
    background: var(--bg-muted);
  }
  .map-info-card__close {
    all: unset;
    position: absolute;
    top: 6px;
    right: 6px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(0,0,0,0.5);
    color: #fff;
    font-size: 16px;
    cursor: pointer;
  }
`
