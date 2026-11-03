'use client'

import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'
import type { PartnerData } from './MapWidget'

export type { PartnerData }

function MapPlaceholder() {
  return (
    <div
      role="status"
      className="relative flex flex-col items-center justify-center gap-2 overflow-hidden border border-line text-sm font-medium text-fg-secondary h-[320px] md:h-[420px]"
      style={{ width: '100%', borderRadius: 'var(--radius-lg)', background: 'var(--bg-muted)' }}
    >
      <span className="capi-skel" aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
      <MapPin size={24} strokeWidth={1.75} aria-hidden="true" style={{ position: 'relative' }} />
      <span style={{ position: 'relative' }}>Carregando mapa…</span>
    </div>
  )
}

const MapWidget = dynamic(
  () => import('./MapWidget'),
  {
    ssr: false,
    loading: () => <MapPlaceholder />,
  }
)

interface MapWidgetClientProps {
  lat: number
  lng: number
  partners: PartnerData[]
  destinationName: string
}

export default function MapWidgetClient(props: MapWidgetClientProps) {
  return <MapWidget {...props} />
}
