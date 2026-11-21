/**
 * @deprecated Use `@/src/components/ui/map/MapWidgetClient` instead.
 * This file exists for backward compatibility.
 */
'use client'

import MapWidgetClientNew, { type MapMarker } from './map/MapWidgetClient'

export interface PartnerData {
  id: string
  name: string
  lat: number
  lng: number
}

interface MapWidgetClientProps {
  lat: number
  lng: number
  partners: PartnerData[]
  destinationName: string
}

/** Adapter: converts old PartnerData[] to new MapMarker[] */
export default function MapWidgetClient({
  lat,
  lng,
  partners,
  destinationName,
}: MapWidgetClientProps) {
  const markers: MapMarker[] = partners.map((p) => ({
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    type: 'partner' as const,
  }))

  return (
    <MapWidgetClientNew lat={lat} lng={lng} markers={markers} destinationName={destinationName} />
  )
}
