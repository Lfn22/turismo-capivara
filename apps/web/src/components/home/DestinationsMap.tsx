'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre'
import type { MapRef, ViewStateChangeEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

import MapInfoCard, { mapInfoCardStyles, type MapInfoCardData } from '../ui/map/MapInfoCard'

export interface DestinationPin {
  id: string
  slug: string
  title: string
  state: string
  heroImageUrl: string | null
  lat: number
  lng: number
  tourCount: number
}

interface DestinationsMapProps {
  destinations: DestinationPin[]
}

// Brasil fallback center
const BRASIL_CENTER = { longitude: -49.5, latitude: -14.0 }
const BRASIL_ZOOM = 3.5

export default function DestinationsMap({ destinations }: DestinationsMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState({ ...BRASIL_CENTER, zoom: BRASIL_ZOOM })
  const [selected, setSelected] = useState<DestinationPin | null>(null)

  // fitBounds to all destinations on load
  useEffect(() => {
    const map = mapRef.current
    if (!map || destinations.length === 0) return

    // Wait for map to be ready
    const fit = () => {
      if (destinations.length === 1) {
        map.flyTo({ center: [destinations[0].lng, destinations[0].lat], zoom: 10 })
        return
      }
      const lngs = destinations.map((d) => d.lng)
      const lats = destinations.map((d) => d.lat)
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: { top: 50, bottom: 50, left: 50, right: 50 }, maxZoom: 8, duration: 800 },
      )
    }

    if (map.loaded()) fit()
    else map.once('load', fit)
  }, [destinations])

  const handleMove = useCallback((e: ViewStateChangeEvent) => setViewState(e.viewState), [])

  function toInfoCard(d: DestinationPin): MapInfoCardData {
    return {
      id: d.id,
      name: d.title,
      imageUrl: d.heroImageUrl,
      subtitle: d.state,
      badge: d.tourCount > 0 ? `${d.tourCount} roteiro${d.tourCount > 1 ? 's' : ''}` : null,
      href: `/destinos/${d.slug}`,
    }
  }

  return (
    <>
      <style>{`
        .dest-map { width: 100%; height: 280px; border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border); }
        @media (min-width: 768px) { .dest-map { height: 360px; } }
        @media (min-width: 1024px) { .dest-map { height: 480px; } }
        .dest-map .maplibregl-popup-content { padding: 0; border-radius: var(--radius-md, 8px); overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
        .dest-map .maplibregl-popup-close-button { display: none; }
        @media (max-width: 768px) { .dest-map .maplibregl-ctrl-group { display: none !important; } }
        .dest-pin {
          width: 32px; height: 32px; border-radius: 50% 50% 50% 0;
          background: var(--primary); border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          transform: rotate(-45deg); cursor: pointer;
          transition: transform 150ms ease;
        }
        .dest-pin:hover { transform: rotate(-45deg) scale(1.15); }
        .dest-pin--selected { background: var(--fg); }
        ${mapInfoCardStyles}
      `}</style>
      <div className="dest-map" role="region" aria-label="Mapa dos destinos CAPI">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={handleMove}
          mapStyle="/api/tiles/maps/basic-v2/style.json"
          style={{ width: '100%', height: '100%' }}
          cooperativeGestures
          attributionControl={false}
        >
          <NavigationControl position="top-right" />

          {destinations.map((d) => (
            <Marker key={d.id} longitude={d.lng} latitude={d.lat} anchor="bottom">
              <div
                className={`dest-pin ${selected?.id === d.id ? 'dest-pin--selected' : ''}`}
                onClick={() => setSelected(d)}
                role="button"
                aria-label={`${d.title}, ${d.state}`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSelected(d)
                }}
              />
            </Marker>
          ))}

          {selected && (
            <Popup
              longitude={selected.lng}
              latitude={selected.lat}
              anchor="bottom"
              offset={36}
              closeOnClick={false}
              onClose={() => setSelected(null)}
              maxWidth="240px"
            >
              <MapInfoCard data={toInfoCard(selected)} onClose={() => setSelected(null)} />
            </Popup>
          )}
        </Map>
      </div>
    </>
  )
}
