---
plan: 28-03
status: complete
completed: 2026-07-08
---

## What Was Done
Integrated MapWidget into the destination page (`apps/web/app/destinos/[destination-slug]/page.tsx`) with dynamic import (`ssr: false`) and conditional rendering when `lat`/`lng` are present on the destination.

## Files Modified
- `apps/web/app/destinos/[destination-slug]/page.tsx` — added dynamic MapWidget import, `lat`/`lng` to Destination interface, `fetchPartners` function, `partners` call in page component, MapWidget JSX block after BackButton

## Verification

```
grep -n "dynamic.*MapWidget|ssr.*false"
13:    ssr: false,

grep -n "lat: number | null"
47:  lat: number | null;

grep -n "lng: number | null"
48:  lng: number | null;

grep -n "fetchPartners|MapWidget|destination.lat && destination.lng"
5:  import type { PartnerData } from '@/src/components/ui/MapWidget';
10:  const MapWidget = dynamic(
11:    () => import('@/src/components/ui/MapWidget'),
76:  async function fetchPartners(destinationSlug: string): Promise<PartnerData[]> {
154:  const partners = destination.lat && destination.lng
155:    ? await fetchPartners(slug)
562:      {destination.lat && destination.lng && (
563:        <MapWidget

npx tsc --noEmit → no errors
```

## Issues
None - plan executed exactly as written.
