---
phase: 14-gestao-de-conteudo
plan: "05"
subsystem: packages-enrichment
tags: [packages, photos, highlights, zod, vitest]
dependency_graph:
  requires: [14-01, 14-02]
  provides: [package-photos-api, package-highlights-api]
  affects: [packages-module]
tech_stack:
  added: []
  patterns: [service-layer, zod-validation, ownership-check]
key_files:
  created:
    - apps/api/src/modules/packages/packages.schemas.ts
    - apps/api/src/modules/packages/packages.service.ts
    - apps/api/src/modules/packages/packages.routes.test.ts
  modified:
    - apps/api/src/modules/packages/packages.routes.ts
decisions:
  - "Used conductorId (not createdById) for ownership check — TourPackage schema uses conductorId"
  - "Files placed in packages/ (not tours-packages/) — that is the actual module directory"
  - "Tests cover schema validation and service layer via unit tests with mocked Prisma"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-09"
  tasks_completed: 5
  files_created: 3
  files_modified: 1
---

# Phase 14 Plan 05: Package Enrichment (Photos & Highlights) Summary

Package enrichment API enabling guides to add up to 5 photos (URLs) and 10 highlights (strings) to TourPackage records, with immediate publication and ownership-gated PATCH endpoint.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Zod schemas | bc04044 | packages.schemas.ts (created) |
| 2 | Add service methods | 05b8112 | packages.service.ts (created) |
| 3 | Add PATCH endpoint | 3e413d1 | packages.routes.ts (modified) |
| 4 | Verify GET returns photos/highlights | (no code change needed) | packages.routes.ts — GET uses findFirst without select, returns all fields |
| 5 | Write integration tests | 1504667 | packages.routes.test.ts (created) |

## What Was Built

- `UpdatePackagePhotosInput` — Zod schema: photos array, max 5 URLs, URL format validated
- `UpdatePackageHighlightsInput` — Zod schema: highlights array, max 10 items, each 5–200 chars
- `updatePackagePhotos(packageId, userId, photos)` — service method with ownership check via conductorId
- `updatePackageHighlights(packageId, userId, highlights)` — service method with ownership and length checks
- `PATCH /tenants/:slug/packages/:id` — endpoint accepting photos and/or highlights, auth required (CONDUTOR/ADMIN)
- 21 tests covering schema validation, service ownership checks, error cases, and immediate publication

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] corrected ownership field from createdById to conductorId**
- **Found during:** Task 2
- **Issue:** Plan specified `createdById` for ownership check, but TourPackage schema uses `conductorId`
- **Fix:** Service methods check `pkg.conductorId !== userId`
- **Files modified:** packages.service.ts
- **Commit:** 05b8112

**2. [Rule 3 - Blocking] Module directory is packages/ not tours-packages/**
- **Found during:** Task 1
- **Issue:** Plan frontmatter and action blocks reference `apps/api/src/modules/tours-packages/` but actual directory is `apps/api/src/modules/packages/`
- **Fix:** All files created in the correct `packages/` directory
- **Files modified:** All created files

## Known Stubs

None — photos and highlights are fully wired to Prisma update calls. No placeholder data.

## Threat Surface Scan

All mitigations from plan's threat model implemented:
- T-14-19: conductorId ownership check in service before any update
- T-14-20: max(5) enforced in schema and service
- T-14-21: min(5) enforced in schema and service
- T-14-23: z.string().url() validates URL format

No new threat surface beyond what was in the plan.

## Self-Check: PASSED

Files exist:
- apps/api/src/modules/packages/packages.schemas.ts ✓
- apps/api/src/modules/packages/packages.service.ts ✓
- apps/api/src/modules/packages/packages.routes.ts ✓
- apps/api/src/modules/packages/packages.routes.test.ts ✓

Commits exist: bc04044, 05b8112, 3e413d1, 1504667 ✓

Tests: 21 passed ✓
