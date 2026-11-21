'use client'

import { useRef, useEffect } from 'react'
import { SearchX } from 'lucide-react'
import { PackageCard, Skeleton, EmptyState, Button } from '@/src/components/ui/capi'
import type { PackageCardData } from '@/src/components/ui/capi'

export interface SearchPackage {
  id: string
  name: string
  durationMinutes: number
  priceFrom: number
  difficulty: 'EASY' | 'MODERATE' | 'HARD' | null
  coverImageUrl?: string | null
  coverImageBlurDataUrl?: string | null
  tags: string[]
  groupSize?: number | null
  rating?: number | null
  reviewCount?: number | null
  guideName?: string | null
  lat?: number | null
  lng?: number | null
  tenantSlug?: string | null
}

interface PackageListPanelProps {
  packages: SearchPackage[]
  hoveredPackageId: string | null
  selectedPackageId: string | null
  onHover: (id: string | null) => void
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
}

function SkeletonCards() {
  return (
    <div className="pkg-list__grid" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="pkg-list__skel">
          <Skeleton height={180} radius={12} />
          <div style={{ padding: '12px 0' }}>
            <Skeleton height={16} width="80%" />
            <Skeleton height={12} width="50%" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PackageListPanel({
  packages,
  hoveredPackageId,
  selectedPackageId,
  onHover,
  loading,
  hasMore,
  onLoadMore,
}: PackageListPanelProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map())

  // Scroll selected card into view
  useEffect(() => {
    if (!selectedPackageId) return
    const el = cardRefs.current.get(selectedPackageId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedPackageId])

  if (loading && packages.length === 0) {
    return (
      <div className="pkg-list" ref={listRef}>
        <style>{packageListStyles}</style>
        <SkeletonCards />
      </div>
    )
  }

  if (packages.length === 0) {
    return (
      <div className="pkg-list pkg-list--empty" ref={listRef}>
        <style>{packageListStyles}</style>
        <EmptyState
          icon={SearchX}
          title="Nenhum roteiro encontrado"
          description="Tente ajustar os filtros ou mova o mapa para explorar outras regiões."
        />
      </div>
    )
  }

  return (
    <div className="pkg-list" ref={listRef}>
      <style>{packageListStyles}</style>

      <p className="pkg-list__count" role="status">
        <strong>{packages.length}</strong> {packages.length === 1 ? 'roteiro' : 'roteiros'}
      </p>

      <div className="pkg-list__grid" role="list">
        {packages.map((pkg) => {
          const isHovered = hoveredPackageId === pkg.id
          const isSelected = selectedPackageId === pkg.id
          const href = pkg.tenantSlug
            ? `/${pkg.tenantSlug}/roteiros/${pkg.id}`
            : `/roteiros/${pkg.id}`

          const cardData: PackageCardData = {
            name: pkg.name,
            durationMinutes: pkg.durationMinutes,
            priceFrom: pkg.priceFrom,
            difficulty: pkg.difficulty,
            coverImageUrl: pkg.coverImageUrl,
            coverImageBlurDataUrl: pkg.coverImageBlurDataUrl,
            tags: pkg.tags,
            groupSize: pkg.groupSize,
            rating: pkg.rating,
            reviewCount: pkg.reviewCount,
            guideName: pkg.guideName,
          }

          return (
            <div
              key={pkg.id}
              role="listitem"
              ref={(el) => {
                if (el) cardRefs.current.set(pkg.id, el)
                else cardRefs.current.delete(pkg.id)
              }}
              className={[
                'pkg-list__item',
                isHovered && 'pkg-list__item--hovered',
                isSelected && 'pkg-list__item--selected',
              ]
                .filter(Boolean)
                .join(' ')}
              onMouseEnter={() => onHover(pkg.id)}
              onMouseLeave={() => onHover(null)}
            >
              <PackageCard package={cardData} href={href} />
            </div>
          )
        })}
      </div>

      {hasMore && (
        <div className="pkg-list__more">
          <Button variant="secondary" onClick={onLoadMore} disabled={loading}>
            {loading ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      )}
    </div>
  )
}

const packageListStyles = `
  .pkg-list {
    padding: var(--space-4) var(--gutter-mobile);
  }
  @media (min-width: 640px) {
    .pkg-list { padding-inline: var(--gutter-tablet); }
  }
  @media (min-width: 1024px) {
    .pkg-list { padding-inline: var(--space-6); }
  }
  .pkg-list--empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
  }
  .pkg-list__count {
    margin-bottom: var(--space-3);
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }
  .pkg-list__count strong {
    color: var(--text);
    font-weight: 700;
  }
  .pkg-list__grid {
    display: grid;
    gap: var(--space-4);
    grid-template-columns: 1fr;
  }
  @media (min-width: 640px) {
    .pkg-list__grid { grid-template-columns: repeat(2, 1fr); }
  }
  .pkg-list__item {
    border-radius: var(--radius-lg);
    transition: box-shadow 150ms ease;
  }
  .pkg-list__item--hovered {
    box-shadow: 0 0 0 2px var(--primary);
  }
  .pkg-list__item--selected {
    box-shadow: 0 0 0 2px var(--primary);
    background: var(--bg-muted);
    border-radius: var(--radius-lg);
  }
  .pkg-list__skel {
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .pkg-list__more {
    display: flex;
    justify-content: center;
    padding: var(--space-6) 0;
  }
`
