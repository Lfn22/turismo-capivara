---
phase: 26
plan: "05"
subsystem: web/discovery
tags: [frontend, next.js, roteiros, guides, server-component]
dependency_graph:
  requires: [packages/:id/guides API endpoint]
  provides: [roteiro detail page with guides list]
  affects: [destinos/[slug]/roteiros/[id] route]
tech_stack:
  added: []
  patterns: [Server Component async params, field mapping, GuideCard reuse]
key_files:
  created:
    - apps/web/app/destinos/[destination-slug]/roteiros/[id]/page.tsx
    - apps/web/app/destinos/[destination-slug]/roteiros/[id]/loading.tsx
  modified: []
decisions:
  - Map API fields guideId→id and especialidades→specialties at fetch layer
  - packageCount hardcoded to 0 (API does not return this per guide)
  - Breadcrumb links back to /destinos/${slug}/roteiros (not destination root)
metrics:
  duration: "15min"
  completed: "2026-07-07"
---

# Phase 26 Plan 05: Roteiro Detail Page Summary

Roteiro detail page (`/destinos/[slug]/roteiros/[id]`) that fetches `GET /packages/:id/guides` and renders a GuideCard grid; each card links to the guide profile at `/destinos/${slug}/guias/${guide.id}`.

## What Was Built

- **page.tsx** — Server Component with `async params`, fetches API, maps `guideId→id` and `especialidades→specialties`, renders GuideCard list or empty state. `revalidate = 300`.
- **loading.tsx** — Skeleton matching page layout (dark header + 3-card grid), consistent with sibling roteiros/loading.tsx pattern.

## API Field Mapping

| API field | GuideCardGuide field | Note |
|---|---|---|
| `guideId` | `id` | rename |
| `name` | `name` | direct |
| `photoUrl` | `photoUrl` | direct |
| `especialidades` | `specialties` | rename |
| `regioes` | — | not used by GuideCard |
| — | `packageCount` | hardcoded 0 (not in API response) |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `packageCount: 0` — API `/packages/:id/guides` does not return packageCount per guide. GuideCard renders "0 roteiros" in the footer. This is a display stub; no future plan currently wires this field.

## Self-Check

- [x] `apps/web/app/destinos/[destination-slug]/roteiros/[id]/page.tsx` exists
- [x] `apps/web/app/destinos/[destination-slug]/roteiros/[id]/loading.tsx` exists
- [x] Commit `cb35674` exists
- [x] `tsc --noEmit` passed with no errors
