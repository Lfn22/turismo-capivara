'use client'

import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'
import type { MapMarker } from './MapWidget'

export type { MapMarker }
export type { MapInfoCardData } from './MapInfoCard'

function MapPlaceholder({ height }: { height?: { mobile: number; desktop: number } }) {
  const h = height ?? { mobile: 320, desktop: 420 }
  return (
    <div
      role="status"
      style={{
        position: 'relative',
        width: '100%',
        height: h.mobile,
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        background: 'var(--bg-muted)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--text-secondary)',
      }}
    >
      <span
        className="capi-skel"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, borderRadius: 0 }}
      />
      <MapPin size={24} strokeWidth={1.75} aria-hidden="true" style={{ position: 'relative' }} />
      <span style={{ position: 'relative' }}>Carregando mapa…</span>
    </div>
  )
}

const MapWidgetLazy = dynamic(() => import('./MapWidget'), {
  ssr: false,
  loading: () => <MapPlaceholder />,
})

interface MapWidgetClientProps {
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

export default function MapWidgetClient(props: MapWidgetClientProps) {
  return <MapWidgetLazy {...props} />
}
