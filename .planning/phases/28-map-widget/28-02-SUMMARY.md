---
plan: 28-02
phase: 28
status: complete
completed: 2026-07-08
tags: [map, maplibre, proxy, tiles, maptiler]
dependency_graph:
  requires: [28-01]
  provides: [tile-proxy, map-widget-component]
  affects: [apps/web/app/api/tiles, apps/web/src/components/ui]
tech_stack:
  added: [maplibre-gl]
  patterns: [dynamic-import-ssr-safe, catch-all-route-proxy, overpass-graceful-degradation]
key_files:
  created:
    - apps/web/app/api/tiles/[...path]/route.ts
    - apps/web/src/components/ui/MapWidget.tsx
decisions:
  - maplibre-gl imported inside useEffect (not top-level) for SSR safety
  - MAPTILER_KEY only accessed server-side via Next.js API route
  - Overpass POIs degrade gracefully on timeout/failure
metrics:
  duration: ~8min
  tasks_completed: 2
  files_created: 2
---

# Phase 28 Plan 02: Tile Proxy Route and MapWidget Component Summary

Tile proxy server-side route + MapLibre GL React component with partner markers and Overpass POI integration.

## What Was Done

- Created `/api/tiles/[...path]/route.ts` — Next.js catch-all route that proxies Maptiler API tiles server-side, keeping `MAPTILER_KEY` out of the browser
- Created `MapWidget.tsx` — `'use client'` component with dynamic MapLibre GL import inside `useEffect` (SSR-safe), partner markers (ochre `#9C6318`), Overpass POI markers (gray `#6B7280`), loading skeleton, mobile nav controls hidden
- Installed `maplibre-gl` package (was missing from wave 1 dependency setup)

## Files Created

- `apps/web/app/api/tiles/[...path]/route.ts` — Maptiler proxy, MAPTILER_KEY server-side only
- `apps/web/src/components/ui/MapWidget.tsx` — MapLibre GL map with partner + POI markers

## Verification

- MAPTILER_KEY present in route.ts (server-side only, line 14)
- overpass-api.de present in MapWidget.tsx (line 63)
- PartnerData interface exported (line 5)
- TypeScript compiles without errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing maplibre-gl package**
- **Found during:** Task 2 — TypeScript compile error `Cannot find module 'maplibre-gl'`
- **Issue:** `maplibre-gl` not in `apps/web/package.json`; 28-01 only added schema/coords, not the JS package
- **Fix:** `pnpm add maplibre-gl --filter web`
- **Files modified:** `apps/web/package.json`, `pnpm-lock.yaml`
- **Commit:** 871977b

## Self-Check: PASSED

- `apps/web/app/api/tiles/[...path]/route.ts` — FOUND
- `apps/web/src/components/ui/MapWidget.tsx` — FOUND
- Commit 871977b — FOUND
