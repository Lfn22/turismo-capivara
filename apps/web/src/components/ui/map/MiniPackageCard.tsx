'use client'

import Image from 'next/image'
import Link from 'next/link'

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  EASY: { label: 'Fácil', color: 'var(--success, #22c55e)' },
  MODERATE: { label: 'Moderado', color: 'var(--warning, #eab308)' },
  HARD: { label: 'Difícil', color: 'var(--danger, #ef4444)' },
}

export interface MiniPackageCardProps {
  id: string
  name: string
  price: number
  durationMinutes?: number | null
  difficulty?: string | null
  coverPhotoUrl?: string | null
  href: string
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m > 0 ? ` ${m}min` : ''}`
}

export default function MiniPackageCard({
  name,
  price,
  durationMinutes,
  difficulty,
  coverPhotoUrl,
  href,
}: MiniPackageCardProps) {
  const formatted = price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  })
  const diff = difficulty ? DIFFICULTY_LABELS[difficulty] : null

  return (
    <div className="mini-pkg">
      {coverPhotoUrl && (
        <div className="mini-pkg__img">
          <Image src={coverPhotoUrl} alt={name} fill sizes="220px" style={{ objectFit: 'cover' }} />
        </div>
      )}
      <div className="mini-pkg__body">
        <h3 className="mini-pkg__name">{name}</h3>
        <div className="mini-pkg__meta">
          <span className="mini-pkg__price">{formatted}</span>
          {durationMinutes && (
            <span className="mini-pkg__dur">{formatDuration(durationMinutes)}</span>
          )}
          {diff && (
            <span className="mini-pkg__diff" style={{ color: diff.color }}>
              {diff.label}
            </span>
          )}
        </div>
        <Link href={href} className="mini-pkg__cta">
          Ver roteiro
        </Link>
      </div>
    </div>
  )
}

export const miniPackageCardStyles = `
  .mini-pkg {
    width: 220px;
    background: var(--bg-surface, #fff);
    border-radius: var(--radius-md, 8px);
    overflow: hidden;
    font-family: var(--font-sans);
  }
  .mini-pkg__img {
    position: relative;
    width: 100%;
    height: 130px;
  }
  .mini-pkg__body {
    padding: 10px 12px 12px;
  }
  .mini-pkg__name {
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
  .mini-pkg__meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  .mini-pkg__price {
    font-weight: 700;
    color: var(--primary);
    font-size: 14px;
  }
  .mini-pkg__dur {
    color: var(--text-tertiary);
  }
  .mini-pkg__diff {
    font-weight: 600;
    font-size: 11px;
  }
  .mini-pkg__cta {
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
  .mini-pkg__cta:hover {
    background: var(--bg-muted);
  }
`
