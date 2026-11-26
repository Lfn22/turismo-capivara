'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Map, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl/maplibre'
import type { MapRef, ViewStateChangeEvent } from 'react-map-gl/maplibre'
import type { LayerSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import PricePill, { pricePillStyles } from './PricePill'
import MapInfoCard, { mapInfoCardStyles, type MapInfoCardData } from './MapInfoCard'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MapMarker {
  id: string
  lat: number
  lng: number
  name: string
  type: 'partner' | 'poi' | 'package' | 'destination'
  price?: number | null
  imageUrl?: string | null
  duration?: string | null
  subtitle?: string | null
  href?: string
  badge?: string | null
}

interface MapWidgetProps {
  lat: number
  lng: number
  markers?: MapMarker[]
  destinationName: string
  height?: { mobile: number; desktop: number }
  cooperativeGestures?: boolean
  showClustering?: boolean
  hoveredMarkerId?: string | null
  onMarkerHover?: (id: string | null) => void
  onMarkerClick?: (id: string | null) => void
}

// ── Cluster layers ────────────────────────────────────────────────────────────

const clusterCircleLayer: LayerSpecification = {
  id: 'clusters',
  type: 'circle',
  source: 'markers',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 10, '#f1f075', 30, '#f28cb1'],
    'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 30, 40],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fff',
  },
}

const clusterCountLayer: LayerSpecification = {
  id: 'cluster-count',
  type: 'symbol',
  source: 'markers',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-size': 13,
  },
  paint: { 'text-color': '#333' },
}

const unclusteredPointLayer: LayerSpecification = {
  id: 'unclustered-point',
  type: 'circle',
  source: 'markers',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': '#888',
    'circle-radius': 6,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fff',
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function markersToGeoJSON(markers: MapMarker[]) {
  return {
    type: 'FeatureCollection' as const,
    features: markers
      .filter((m) => m.type === 'poi')
      .map((m) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
        properties: { id: m.id, name: m.name },
      })),
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MapWidget({
  lat,
  lng,
  markers = [],
  destinationName,
  height = { mobile: 320, desktop: 420 },
  cooperativeGestures = false,
  showClustering = true,
  hoveredMarkerId,
  onMarkerClick,
}: MapWidgetProps) {
  const mapRef = useRef<MapRef>(null)
  const userInteracted = useRef(false)

  const [viewState, setViewState] = useState({
    longitude: lng,
    latitude: lat,
    zoom: 12,
  })

  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null)

  // Separate markers by type
  const priceMarkers = markers.filter((m) => m.type === 'package' || m.type === 'destination')
  const poiGeoJSON = markersToGeoJSON(markers)
  const partnerMarkers = markers.filter((m) => m.type === 'partner')

  // FitBounds when markers change (only if user hasn't interacted)
  useEffect(() => {
    const map = mapRef.current
    if (!map || markers.length === 0 || userInteracted.current) return

    const coords = markers.map((m) => [m.lng, m.lat] as [number, number])
    if (coords.length === 1) {
      map.flyTo({ center: coords[0], zoom: 14 })
      return
    }

    const lngs = coords.map((c) => c[0])
    const lats = coords.map((c) => c[1])
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: { top: 50, bottom: 50, left: 50, right: 50 }, maxZoom: 16, duration: 500 },
    )
  }, [markers])

  // Reset view when destination changes
  const coordsKey = `${lat},${lng}`
  /* eslint-disable react-hooks/set-state-in-effect -- syncing props→state on destination change */
  useEffect(() => {
    userInteracted.current = false
    setSelectedMarker(null)
    setViewState({ longitude: lng, latitude: lat, zoom: 12 })
  }, [coordsKey]) // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleMove = useCallback((e: ViewStateChangeEvent) => {
    setViewState(e.viewState)
  }, [])

  const handleDragStart = useCallback(() => {
    userInteracted.current = true
  }, [])

  const handleMarkerClick = useCallback(
    (marker: MapMarker) => {
      setSelectedMarker(marker)
      onMarkerClick?.(marker.id)
    },
    [onMarkerClick],
  )

  const handleClosePopup = useCallback(() => {
    setSelectedMarker(null)
    onMarkerClick?.(null)
  }, [onMarkerClick])

  function toInfoCard(m: MapMarker): MapInfoCardData {
    return {
      id: m.id,
      name: m.name,
      imageUrl: m.imageUrl,
      price: m.price,
      duration: m.duration,
      subtitle: m.subtitle,
      href: m.href ?? '#',
      badge: m.badge,
    }
  }

  return (
    <>
      <style>{`
        .map-widget { position: relative; width: 100%; height: ${height.mobile}px; border-radius: var(--radius-lg); border: 1px solid var(--border); overflow: hidden; }
        @media (min-width: 768px) { .map-widget { height: ${height.desktop}px; } }
        .map-widget .maplibregl-popup-content { padding: 0; border-radius: var(--radius-md, 8px); overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
        .map-widget .maplibregl-popup-close-button { display: none; }
        @media (max-width: 768px) { .map-widget .maplibregl-ctrl-group { display: none !important; } }
        ${pricePillStyles}
        ${mapInfoCardStyles}
      `}</style>
      <div className="map-widget" aria-label={`Mapa de ${destinationName}`} role="region">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={handleMove}
          onDragStart={handleDragStart}
          mapStyle="/api/tiles/maps/basic-v2/style.json"
          style={{ width: '100%', height: '100%' }}
          cooperativeGestures={cooperativeGestures}
          attributionControl={false}
        >
          <NavigationControl position="top-right" />

          {/* POI clustering via GeoJSON source */}
          {showClustering && poiGeoJSON.features.length > 0 && (
            <Source
              id="markers"
              type="geojson"
              data={poiGeoJSON}
              cluster
              clusterMaxZoom={14}
              clusterRadius={50}
            >
              <Layer {...clusterCircleLayer} />
              <Layer {...clusterCountLayer} />
              <Layer {...unclusteredPointLayer} />
            </Source>
          )}

          {/* Partner markers (simple dots) */}
          {partnerMarkers.map((m) => (
            <Marker
              key={m.id}
              longitude={m.lng}
              latitude={m.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                handleMarkerClick(m)
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: 'var(--text-tertiary)',
                  border: '2px solid #fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                }}
              />
            </Marker>
          ))}

          {/* Price pill markers (packages/destinations) */}
          {priceMarkers.map((m) => (
            <Marker key={m.id} longitude={m.lng} latitude={m.lat} anchor="center">
              <PricePill
                price={m.price ?? 0}
                name={m.name}
                selected={selectedMarker?.id === m.id}
                hovered={hoveredMarkerId === m.id}
                onClick={() => handleMarkerClick(m)}
              />
            </Marker>
          ))}

          {/* Popup */}
          {selectedMarker && (
            <Popup
              longitude={selectedMarker.lng}
              latitude={selectedMarker.lat}
              anchor="bottom"
              offset={20}
              closeOnClick={false}
              onClose={handleClosePopup}
              maxWidth="240px"
            >
              <MapInfoCard data={toInfoCard(selectedMarker)} onClose={handleClosePopup} />
            </Popup>
          )}
        </Map>
      </div>
    </>
  )
}
