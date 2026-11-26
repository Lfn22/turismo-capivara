'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre'
import type { MapRef, ViewStateChangeEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

import PricePill, { pricePillStyles } from '@/src/components/ui/map/PricePill'
import MiniPackageCard, { miniPackageCardStyles } from '@/src/components/ui/map/MiniPackageCard'
import type { SearchPackage } from './PackageListPanel'

export interface MapBounds {
  sw_lat: number
  sw_lng: number
  ne_lat: number
  ne_lng: number
}

interface SearchMapProps {
  packages: SearchPackage[]
  hoveredPackageId: string | null
  selectedPackageId: string | null
  onMarkerHover: (id: string | null) => void
  onMarkerClick: (id: string | null) => void
  onBoundsChange: (bounds: MapBounds) => void
}

// São Raimundo Nonato (Serra da Capivara region) as default center
const DEFAULT_CENTER = { lat: -8.98, lng: -42.7 }
const DEFAULT_ZOOM = 8

export default function SearchMap({
  packages,
  hoveredPackageId,
  selectedPackageId,
  onMarkerHover,
  onMarkerClick,
  onBoundsChange,
}: SearchMapProps) {
  const mapRef = useRef<MapRef>(null)
  const boundsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [viewState, setViewState] = useState({
    longitude: DEFAULT_CENTER.lng,
    latitude: DEFAULT_CENTER.lat,
    zoom: DEFAULT_ZOOM,
  })

  const selectedPkg = packages.find((p) => p.id === selectedPackageId) ?? null

  // Fit bounds to packages on first load
  const hasInitialized = useRef(false)
  useEffect(() => {
    const map = mapRef.current
    if (!map || packages.length === 0 || hasInitialized.current) return

    const withCoords = packages.filter((p) => p.lat != null && p.lng != null)
    if (withCoords.length === 0) return

    hasInitialized.current = true

    if (withCoords.length === 1) {
      map.flyTo({ center: [withCoords[0].lng!, withCoords[0].lat!], zoom: 13, duration: 500 })
      return
    }

    const lngs = withCoords.map((p) => p.lng!)
    const lats = withCoords.map((p) => p.lat!)
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: { top: 50, bottom: 50, left: 50, right: 50 }, maxZoom: 15, duration: 500 },
    )
  }, [packages])

  const handleMove = useCallback((e: ViewStateChangeEvent) => {
    setViewState(e.viewState)
  }, [])

  const handleMoveEnd = useCallback(() => {
    const map = mapRef.current
    if (!map) return

    if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current)
    boundsTimerRef.current = setTimeout(() => {
      const bounds = map.getBounds()
      if (!bounds) return
      const sw = bounds.getSouthWest()
      const ne = bounds.getNorthEast()
      onBoundsChange({
        sw_lat: sw.lat,
        sw_lng: sw.lng,
        ne_lat: ne.lat,
        ne_lng: ne.lng,
      })
    }, 300)
  }, [onBoundsChange])

  useEffect(() => {
    return () => {
      if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current)
    }
  }, [])

  const handleMarkerClick = useCallback(
    (pkg: SearchPackage) => {
      onMarkerClick(pkg.id)
    },
    [onMarkerClick],
  )

  const handleClosePopup = useCallback(() => {
    onMarkerClick(null)
  }, [onMarkerClick])

  const packagesWithCoords = packages.filter((p) => p.lat != null && p.lng != null)

  return (
    <>
      <style>{`
        .search-map { width: 100%; height: 100%; }
        .search-map .maplibregl-popup-content {
          padding: 0;
          border-radius: var(--radius-md, 8px);
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        }
        .search-map .maplibregl-popup-close-button { display: none; }
        ${pricePillStyles}
        ${miniPackageCardStyles}
      `}</style>
      <div className="search-map" role="region" aria-label="Mapa de roteiros">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={handleMove}
          onMoveEnd={handleMoveEnd}
          mapStyle="/api/tiles/maps/basic-v2/style.json"
          style={{ width: '100%', height: '100%' }}
          cooperativeGestures={false}
          attributionControl={false}
        >
          <NavigationControl position="top-right" />

          {packagesWithCoords.map((pkg) => (
            <Marker key={pkg.id} longitude={pkg.lng!} latitude={pkg.lat!} anchor="center">
              <span
                onMouseEnter={() => onMarkerHover(pkg.id)}
                onMouseLeave={() => onMarkerHover(null)}
              >
                <PricePill
                  price={pkg.priceFrom / 100}
                  name={pkg.name}
                  selected={selectedPackageId === pkg.id}
                  hovered={hoveredPackageId === pkg.id}
                  onClick={() => handleMarkerClick(pkg)}
                />
              </span>
            </Marker>
          ))}

          {selectedPkg && selectedPkg.lat != null && selectedPkg.lng != null && (
            <Popup
              longitude={selectedPkg.lng!}
              latitude={selectedPkg.lat!}
              anchor="bottom"
              offset={20}
              closeOnClick={false}
              onClose={handleClosePopup}
              maxWidth="240px"
            >
              <MiniPackageCard
                id={selectedPkg.id}
                name={selectedPkg.name}
                price={selectedPkg.priceFrom / 100}
                durationMinutes={selectedPkg.durationMinutes}
                difficulty={selectedPkg.difficulty}
                coverPhotoUrl={selectedPkg.coverImageUrl}
                href={
                  selectedPkg.tenantSlug
                    ? `/${selectedPkg.tenantSlug}/roteiros/${selectedPkg.id}`
                    : `/roteiros/${selectedPkg.id}`
                }
              />
            </Popup>
          )}
        </Map>
      </div>
    </>
  )
}
