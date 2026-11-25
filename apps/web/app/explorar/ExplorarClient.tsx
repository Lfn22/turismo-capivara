'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'
import FilterBar, { type Filters } from './components/FilterBar'
import PackageListPanel, { type SearchPackage } from './components/PackageListPanel'
import MapToggleFab from './components/MapToggleFab'
import type { MapBounds } from './components/SearchMap'
import { parseSearchResponse, priceFilterParam } from './search-response'

const SearchMap = dynamic(() => import('./components/SearchMap'), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        background: 'var(--bg-muted)',
        fontFamily: 'var(--font-sans)',
        fontSize: '14px',
        color: 'var(--text-secondary)',
      }}
    >
      <span
        className="capi-skel"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, borderRadius: 0 }}
      />
      <MapPin size={24} strokeWidth={1.75} aria-hidden="true" style={{ position: 'relative' }} />
      <span style={{ position: 'relative' }}>Carregando mapa...</span>
    </div>
  ),
})

export interface ExplorarClientProps {
  initialPackages: SearchPackage[]
  initialNextCursor?: string | null
  initialHasMore?: boolean
  initialParams: {
    q?: string
    minPrice?: string
    maxPrice?: string
    difficulty?: string[]
  }
}

const PAGE_SIZE = 20

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

/** Public search — no auth required. Calls API directly (public endpoint). */
function buildPublicSearchUrl(
  filters: Filters,
  bounds: MapBounds | null,
  cursor?: string | null,
): string {
  const qp = new URLSearchParams()

  if (filters.q) qp.set('search', filters.q)
  // A API compara preço em reais
  const min = filters.minPrice ? priceFilterParam(filters.minPrice) : undefined
  const max = filters.maxPrice ? priceFilterParam(filters.maxPrice) : undefined
  if (min) qp.set('min_price', min)
  if (max) qp.set('max_price', max)
  if (filters.difficulty.length > 0) qp.set('difficulty', filters.difficulty.join(','))
  if (bounds) {
    qp.set('sw_lat', String(bounds.sw_lat))
    qp.set('sw_lng', String(bounds.sw_lng))
    qp.set('ne_lat', String(bounds.ne_lat))
    qp.set('ne_lng', String(bounds.ne_lng))
  }
  qp.set('limit', String(PAGE_SIZE))
  if (cursor) qp.set('cursor', cursor)

  const qs = qp.toString()
  return `${PUBLIC_API_URL}/packages/search${qs ? `?${qs}` : ''}`
}

export default function ExplorarClient({
  initialPackages,
  initialNextCursor = null,
  initialHasMore = false,
  initialParams,
}: ExplorarClientProps) {
  const [packages, setPackages] = useState<SearchPackage[]>(initialPackages)
  const [loading, setLoading] = useState(false)
  // Cursor do SSR: "carregar mais" continua da 2ª página em vez de repetir a 1ª
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [hoveredPackageId, setHoveredPackageId] = useState<string | null>(null)
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
  const [mapMoved, setMapMoved] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    q: initialParams.q ?? '',
    minPrice: initialParams.minPrice ?? '',
    maxPrice: initialParams.maxPrice ?? '',
    difficulty: initialParams.difficulty ?? [],
  })

  const fetchRef = useRef(0)

  const fetchPackages = useCallback(
    async (f: Filters, bounds: MapBounds | null, cursor: string | null, append: boolean) => {
      const id = ++fetchRef.current
      setLoading(true)

      try {
        const url = buildPublicSearchUrl(f, bounds, cursor)
        const res = await fetch(url)
        if (!res.ok) throw new Error('fetch failed')

        const {
          packages: list,
          nextCursor: cursorNext,
          hasMore: more,
        } = parseSearchResponse(await res.json())

        if (id !== fetchRef.current) return // stale

        if (append) {
          setPackages((prev) => [...prev, ...list])
        } else {
          setPackages(list)
        }
        setNextCursor(cursorNext)
        setHasMore(more)
      } catch {
        // Keep existing packages on error
        if (id === fetchRef.current) setHasMore(false)
      } finally {
        if (id === fetchRef.current) setLoading(false)
      }
    },
    [],
  )

  // Sync filters to URL
  useEffect(() => {
    const sp = new URLSearchParams()
    if (filters.q) sp.set('q', filters.q)
    if (filters.minPrice) sp.set('minPrice', filters.minPrice)
    if (filters.maxPrice) sp.set('maxPrice', filters.maxPrice)
    if (filters.difficulty.length > 0) sp.set('difficulty', filters.difficulty.join(','))
    const qs = sp.toString()
    const url = qs ? `/explorar?${qs}` : '/explorar'
    window.history.replaceState(null, '', url)
  }, [filters])

  // Refetch when filters change
  const prevFiltersRef = useRef(filters)
  useEffect(() => {
    if (prevFiltersRef.current === filters) return
    prevFiltersRef.current = filters
    fetchPackages(filters, mapBounds, null, false)
  }, [filters, mapBounds, fetchPackages])

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds)
    setMapMoved(true)
  }, [])

  const handleSearchArea = useCallback(() => {
    setMapMoved(false)
    fetchPackages(filters, mapBounds, null, false)
  }, [filters, mapBounds, fetchPackages])

  const handleFilterChange = useCallback((f: Filters) => {
    setFilters(f)
    setMapMoved(false)
  }, [])

  const handleLoadMore = useCallback(() => {
    fetchPackages(filters, mapBounds, nextCursor, true)
  }, [filters, mapBounds, nextCursor, fetchPackages])

  const handleMarkerClick = useCallback((id: string | null) => {
    setSelectedPackageId(id)
  }, [])

  return (
    <>
      <style>{explorarClientStyles}</style>
      <div className="explorar-split">
        {/* List panel — hidden on mobile when map is shown */}
        <div className={`explorar-split__list${showMap ? ' explorar-split__list--hidden' : ''}`}>
          <div className="explorar-split__filter-wrap">
            <FilterBar
              filters={filters}
              onChange={handleFilterChange}
              showSearchArea={mapMoved}
              onSearchArea={handleSearchArea}
            />
          </div>
          <PackageListPanel
            packages={packages}
            hoveredPackageId={hoveredPackageId}
            selectedPackageId={selectedPackageId}
            onHover={setHoveredPackageId}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
          />
        </div>

        {/* Map panel — hidden on mobile when list is shown */}
        <div className={`explorar-split__map${!showMap ? ' explorar-split__map--hidden' : ''}`}>
          <SearchMap
            packages={packages}
            hoveredPackageId={hoveredPackageId}
            selectedPackageId={selectedPackageId}
            onMarkerHover={setHoveredPackageId}
            onMarkerClick={handleMarkerClick}
            onBoundsChange={handleBoundsChange}
          />
        </div>

        <MapToggleFab showMap={showMap} onToggle={() => setShowMap((v) => !v)} />
      </div>
    </>
  )
}

const explorarClientStyles = `
  .explorar-split {
    display: grid;
    grid-template-columns: 1fr;
    height: calc(100dvh - 56px);
    overflow: hidden;
    position: relative;
  }
  @media (min-width: 1024px) {
    .explorar-split {
      grid-template-columns: minmax(400px, 55%) 1fr;
    }
  }
  .explorar-split__list {
    overflow-y: auto;
    overscroll-behavior: contain;
    min-height: 0;
  }
  .explorar-split__map {
    position: sticky;
    top: 0;
    height: 100%;
    min-height: 0;
  }

  /* Mobile: show one or the other */
  @media (max-width: 1023px) {
    .explorar-split__list--hidden { display: none; }
    .explorar-split__map--hidden { display: none; }
    .explorar-split__list:not(.explorar-split__list--hidden) {
      height: calc(100dvh - 56px);
    }
    .explorar-split__map:not(.explorar-split__map--hidden) {
      height: calc(100dvh - 56px);
    }
  }

  /* Desktop: always show both */
  @media (min-width: 1024px) {
    .explorar-split__list--hidden { display: block; }
    .explorar-split__map--hidden { display: block; }
  }

  .explorar-split__filter-wrap {
    position: sticky;
    top: 0;
    z-index: var(--z-sticky, 10);
    background: var(--glass, rgba(255,255,255,0.85));
    -webkit-backdrop-filter: saturate(1.6) blur(16px);
    backdrop-filter: saturate(1.6) blur(16px);
    border-bottom: 1px solid var(--border);
    padding-inline: var(--gutter-mobile);
  }
  @media (min-width: 640px) {
    .explorar-split__filter-wrap { padding-inline: var(--gutter-tablet); }
  }
  @media (min-width: 1024px) {
    .explorar-split__filter-wrap { padding-inline: var(--space-6); }
  }
`
