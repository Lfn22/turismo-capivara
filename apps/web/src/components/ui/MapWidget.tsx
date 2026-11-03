'use client'

import { useRef, useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'

/** Lê um token de cor do design system (maplibre precisa do valor resolvido). */
function cssColor(name: string): string {
  if (typeof window === 'undefined') return 'gray'
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || 'gray'
}

export interface PartnerData {
  id: string
  name: string
  lat: number
  lng: number
}

interface MapWidgetProps {
  lat: number
  lng: number
  partners: PartnerData[]
  destinationName: string
}

export default function MapWidget({ lat, lng, partners, destinationName }: MapWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const maplibreRef = useRef<any>(null)
  const partnerMarkersRef = useRef<any[]>([])
  const [loading, setLoading] = useState(true)

  // Effect 1: map lifecycle — runs only when coordinates change
  useEffect(() => {
    if (!containerRef.current) return

    let aborted = false

    async function init() {
      const maplibregl = (await import('maplibre-gl')).default
      await import('maplibre-gl/dist/maplibre-gl.css')

      if (aborted || !containerRef.current) return

      maplibreRef.current = maplibregl

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: '/api/tiles/styles/basic-v2/style.json',
        center: [lng, lat],
        zoom: 12,
      })

      mapRef.current = map
      map.addControl(new maplibregl.NavigationControl(), 'top-right')

      map.on('load', async () => {
        setLoading(false)

        // Fetch POIs from Overpass with graceful degradation
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 10000)
          const query = `[out:json][timeout:8];(node["tourism"](around:5000,${lat},${lng}););out body;`
          const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal,
          })
          clearTimeout(timeout)
          if (res.ok) {
            const data = await res.json()
            for (const element of (data.elements ?? [])) {
              if (!element.lat || !element.lon) continue
              new maplibregl.Marker({ color: cssColor('--text-tertiary') })
                .setLngLat([element.lon, element.lat])
                .addTo(map)
            }
          }
        } catch {
          // POIs indisponíveis — mapa exibe só marcadores de parceiros
        }
      })
    }

    init()

    return () => {
      aborted = true
      partnerMarkersRef.current.forEach(m => m.remove())
      partnerMarkersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
      maplibreRef.current = null
    }
  }, [lat, lng]) // eslint-disable-line react-hooks/exhaustive-deps

  // Effect 2: partner markers — updates without rebuilding the map
  useEffect(() => {
    const map = mapRef.current
    const maplibregl = maplibreRef.current
    if (!map || !maplibregl) return

    // Remove previous partner markers
    partnerMarkersRef.current.forEach(m => m.remove())
    partnerMarkersRef.current = []

    // Add current partners
    const newMarkers = partners.map(partner => {
      const el = document.createElement('div')
      el.className = 'map-widget__marker map-widget__marker--partner'
      return new maplibregl.Marker({ element: el, color: cssColor('--primary') })
        .setLngLat([partner.lng, partner.lat])
        .setPopup(new maplibregl.Popup().setText(partner.name))
        .addTo(map)
    })
    partnerMarkersRef.current = newMarkers
  }, [partners])

  return (
    <>
      <style>{`
        .map-widget__container {
          position: relative;
          width: 100%;
          height: 320px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          overflow: hidden;
          background: var(--bg-muted);
        }
        @media (min-width: 768px) { .map-widget__container { height: 420px; } }
        .map-widget__map {
          width: 100%;
          height: 100%;
        }
        .map-widget__skeleton {
          position: absolute;
          inset: 0;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .map-widget__skeleton .capi-skel { position: absolute; inset: 0; border-radius: 0; }
        .map-widget__skeleton > :not(.capi-skel) { position: relative; }
        @media (max-width: 768px) {
          .maplibregl-ctrl-group { display: none !important; }
        }
      `}</style>
      <div className="map-widget__container" aria-label={`Mapa de ${destinationName}`} role="region">
        {loading && (
          <div className="map-widget__skeleton" role="status">
            <span className="capi-skel" aria-hidden="true" style={{ width: '100%', height: '100%' }} />
            <MapPin size={24} strokeWidth={1.75} aria-hidden="true" />
            <span>Carregando mapa…</span>
          </div>
        )}
        <div ref={containerRef} className="map-widget__map" />
      </div>
    </>
  )
}
