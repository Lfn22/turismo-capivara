---
phase: 14-gestao-de-conteudo
plan: "08"
subsystem: public-marketplace-visibility
tags: [destinations, marketplace, approval-filter, photos, highlights]
dependency_graph:
  requires: [14-01, 14-04, 14-06]
  provides: [public-content-filtering, photos-highlights-display]
  affects: [destinations-public-api, roteiros-detail-page]
tech_stack:
  added: []
  patterns: [approval-status-filter, destructuring-omit-internal-field]
key_files:
  created: []
  modified:
    - apps/api/src/modules/destinations/destinations.routes.ts
    - apps/web/app/[slug]/(public)/roteiros/[packageId]/page.tsx
    - apps/api/src/modules/destinations/destinations.routes.test.ts
decisions:
  - Strip approvalStatus from public detail response to prevent field leakage
  - Return 404 (not 403) for PENDING/REJECTED destinations to prevent enumeration (T-14-31)
metrics:
  duration: "~8min"
  completed: "2026-06-09T23:13:43Z"
  tasks_completed: 5
  files_modified: 3
---

# Phase 14 Plan 08: Public Marketplace Content Visibility Filtering Summary

Public marketplace content now filtered to show only approved/published content. API enforces `approvalStatus: APPROVED` on public destination endpoints; itinerary detail page renders photos and highlights galleries.

## What Was Built

**Task 1 — GET /destinations public list filter:**
Added `approvalStatus: 'APPROVED'` to `WHERE` clause of public list endpoint. PENDING and REJECTED destinations no longer appear in marketplace listing.

**Task 2 — GET /destinations/:slug public detail filter:**
Detail endpoint now fetches `approvalStatus` field, checks it equals `APPROVED`, and throws 404 otherwise. `approvalStatus` field is stripped from the response before sending (destructuring omit) to prevent leaking internal moderation state to tourists.

**Task 3 — Public /destinos page (no changes needed):**
Page at `apps/web/src/app/destinos/page.tsx` already correctly fetches from `/destinations` API with no status badge shown to tourists. API-side filtering is sufficient — page receives only APPROVED destinations automatically.

**Task 4 — Public roteiro detail page photos/highlights:**
Added `photos` and `highlights` optional fields to `TourPackage` interface. Added two conditional sections above the slot picker:
- "Fotos do roteiro" — responsive image grid (`auto-fill minmax(200px, 1fr)`), hidden when empty
- "Experiências incluídas" — bullet list, hidden when empty

**Task 5 — Integration tests:**
Added 8 new test cases to `destinations.routes.test.ts` verifying public visibility logic. All 45 tests pass.

## Files Modified

| File | Change |
|------|--------|
| `apps/api/src/modules/destinations/destinations.routes.ts` | Added `approvalStatus: 'APPROVED'` to GET /destinations WHERE; GET /destinations/:slug returns 404 for non-APPROVED; strips field from response |
| `apps/web/app/[slug]/(public)/roteiros/[packageId]/page.tsx` | Added `photos?` and `highlights?` to TourPackage interface; added photos gallery and highlights list sections |
| `apps/api/src/modules/destinations/destinations.routes.test.ts` | Added 8 public visibility tests (list filter, detail APPROVED/PENDING/REJECTED/null cases) |

## Commits

| Hash | Message |
|------|---------|
| `9dcc5e9` | feat(14-08): filter public GET /destinations by approvalStatus APPROVED |
| `e7ead8d` | feat(14-08): add photos and highlights sections to public roteiro detail page |
| `e45eea0` | test(14-08): add public visibility filtering tests for destinations |

## Deviations from Plan

**1. [Rule 2 - Security] Strip approvalStatus from public detail response**
- **Found during:** Task 2
- **Issue:** Plan showed returning full destination object; `approvalStatus` field would leak internal moderation state to tourists
- **Fix:** Destructure and omit `approvalStatus` before `reply.send()` — `const { approvalStatus: _status, ...publicDestination } = destination`
- **Files modified:** `apps/api/src/modules/destinations/destinations.routes.ts`
- **Commit:** `9dcc5e9`

**2. Task 3 — No changes required**
- Plan anticipated possible updates to `/destinos/page.tsx`, but the page already fetches from `/destinations` without showing status badges. API-side filtering is the correct enforcement point.

## Known Stubs

None — all data flows are wired. Photos and highlights sections are conditionally rendered (`pkg.photos?.length > 0`), so they are silently hidden when the API returns empty arrays.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| mitigated: T-14-31 | destinations.routes.ts | GET /destinations/:slug returns 404 for non-APPROVED (prevents enumeration) |

## Self-Check: PASSED

- `apps/api/src/modules/destinations/destinations.routes.ts` — modified, committed `9dcc5e9`
- `apps/web/app/[slug]/(public)/roteiros/[packageId]/page.tsx` — modified, committed `e7ead8d`
- `apps/api/src/modules/destinations/destinations.routes.test.ts` — modified, committed `e45eea0`
- All 45 tests passing
