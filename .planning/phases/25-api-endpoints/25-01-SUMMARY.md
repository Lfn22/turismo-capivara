---
phase: 25-api-endpoints
plan: "01"
subsystem: api-endpoints
tags: [marketplace, packages, guides, destinations, schedule-conflict, prisma-transaction]
dependency_graph:
  requires: []
  provides:
    - GET /destinations/:slug/packages
    - GET /packages/:id/guides
    - GET /guides/:id/packages
    - POST /tenants/:slug/packages/:id/slots (guideId + conflict check)
  affects:
    - apps/api/src/modules/destinations/destinations.routes.ts
    - apps/api/src/modules/packages/packages.routes.ts
    - apps/api/src/modules/guides/guides.routes.ts
tech_stack:
  added: []
  patterns:
    - prisma.$transaction with ScheduleConflictError pattern
    - Overlap detection via TypeScript after DB pre-filter
key_files:
  created: []
  modified:
    - apps/api/src/modules/destinations/destinations.routes.ts
    - apps/api/src/modules/packages/packages.routes.ts
    - apps/api/src/modules/guides/guides.routes.ts
decisions:
  - "SlotStatus CONFIRMED does not exist in schema — filter uses OPEN|FULL instead"
  - "Used select instead of include in findMany to get correct TypeScript types for nested package relation"
metrics:
  duration: ~15min
  completed: "2026-07-04"
---

# Phase 25 Plan 01: API Endpoints & Conflict Logic Summary

Three public discovery endpoints added and POST slots updated with guide qualification and schedule conflict detection.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | GET /destinations/:slug/packages | 01c6d1a | destinations.routes.ts |
| 2 | GET /packages/:id/guides + GET /guides/:id/packages | 735e7e9 | packages.routes.ts, guides.routes.ts |
| 3 | POST slots: guideId + GUIDE_NOT_QUALIFIED + $transaction conflict check | 1305dbb | packages.routes.ts |

## Endpoints Implemented

**GET /destinations/:slug/packages** — Returns active packages for an approved destination, joining via `tenant.destinationId`. Returns 404 for inactive or non-approved destination. `price` serialized as `Number`, includes `tenantSlug`.

**GET /packages/:id/guides** — Returns guides with `PackageGuide.active=true` for a given package. Public, no auth. Returns `guideId, name, bio, photoUrl, especialidades, regioes`.

**GET /guides/:id/packages** — Returns packages where guide has `PackageGuide.active=true`. Public, no auth. Returns `id, name, price (Number), durationMinHours, durationMaxHours, difficulty`.

**POST /tenants/:slug/packages/:id/slots** — Now requires `guideId` in body (Zod validation). Two-phase check:
1. `GUIDE_NOT_QUALIFIED` (400) — if `PackageGuide` with `active=true` not found, before entering transaction
2. `GUIDE_SCHEDULE_CONFLICT` (409) — inside `prisma.$transaction`, overlap computed in TypeScript after DB pre-filter using `startsAt < newSlotEnd` (leverages `@@index([guideId, startsAt])`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SlotStatus 'CONFIRMED' does not exist**
- **Found during:** Task 3, TypeScript check
- **Issue:** Plan specified `status: { in: ['OPEN', 'CONFIRMED'] }` but `CONFIRMED` is not a value in the `SlotStatus` enum (values are OPEN, FULL, CANCELLED, COMPLETED)
- **Fix:** Changed filter to `{ in: ['OPEN', 'FULL'] }` — these are the statuses where a guide is actively committed to a slot
- **Files modified:** apps/api/src/modules/packages/packages.routes.ts
- **Commit:** 1305dbb

**2. [Rule 1 - Bug] TypeScript type error with `include` on findMany**
- **Found during:** Task 3, TypeScript check
- **Issue:** Using `include: { package: { select: ... } }` caused TS2551 because the inferred return type didn't expose `package` as a property (Prisma typing issue)
- **Fix:** Switched to `select: { startsAt: true, package: { select: ... } }` which produces correct TypeScript types
- **Files modified:** apps/api/src/modules/packages/packages.routes.ts
- **Commit:** 1305dbb

## SCHED-03 Confirmation

`grep -n "PackageGuide" apps/api/prisma/schema.prisma` shows no `onDelete: Cascade` on PackageGuide relations. Existing slots are preserved when a PackageGuide is deactivated or deleted (Prisma default: Restrict).

## Self-Check: PASSED

- `01c6d1a` — feat(25-01): add GET /destinations/:slug/packages public endpoint
- `735e7e9` — feat(25-01): add GET /packages/:id/guides and GET /guides/:id/packages endpoints
- `1305dbb` — feat(25-01): add guideId to POST slots with GUIDE_NOT_QUALIFIED and conflict check
- `npx tsc --noEmit` — zero errors
