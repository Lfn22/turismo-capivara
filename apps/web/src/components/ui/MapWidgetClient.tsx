'use client'

import dynamic from 'next/dynamic'
import type { PartnerData } from './MapWidget'

export type { PartnerData }

const MapWidget = dynamic(
  () => import('./MapWidget'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        width: '100%',
        height: '400px',
        borderRadius: '12px',
        background: 'var(--stone-100, #f5f0eb)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--stone-400, #a8a29e)',
        fontSize: '0.875rem',
      }}>
        Carregando mapa...
      </div>
    )
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
