---
phase: 03-roteiros-e-disponibilidade
plan: "02"
subsystem: packages-api
tags: [packages, crud, condutor, ownership, soft-delete, hasMinimumReached]
dependency_graph:
  requires: [03-01]
  provides: [package-write-endpoints, hasMinimumReached-field]
  affects: [apps/api/src/modules/packages/packages.routes.ts]
tech_stack:
  added: []
  patterns: [ownership-check, soft-delete, zod-body-validation, authenticate-authorize-prehandler]
key_files:
  created: []
  modified:
    - apps/api/src/modules/packages/packages.routes.ts
decisions:
  - conductorId always set from JWT.sub — never from request body (T-03-02-02)
  - ADMIN bypasses ownership check by design — only CONDUTOR role is ownership-gated
  - Soft-delete via active=false — packages remain in DB for historical booking integrity
metrics:
  duration: ~2min
  completed_date: "2026-04-30"
  tasks_completed: 2
  files_modified: 1
---

# Phase 3 Plan 02: Package Write Endpoints Summary

One-liner: POST/PUT/DELETE endpoints for TourPackage management with JWT-based ownership enforcement and hasMinimumReached computed field on GET responses.

## What Was Built

Added write endpoints to `packages.routes.ts` enabling CONDUTOR/ADMIN to manage tour packages, and updated GET endpoints to expose computed `hasMinimumReached` per departure slot.

### Task 1 — hasMinimumReached on GET responses (commit b88589c)

Both GET handlers (`/packages` and `/packages/:id`) now transform `departureSlots` to include `hasMinimumReached: slot.booked >= slot.minCapacity`. Consumers can use this field to show "minimum group size reached" indicators without client-side computation.

### Task 2 — POST, PUT, DELETE endpoints (commit 5901f84)

Three write endpoints registered behind `authenticate + authorize([CONDUTOR, ADMIN])`:

- **POST /tenants/:slug/packages** — creates package; `conductorId` set from `JWT.sub`, never from body
- **PUT /tenants/:slug/packages/:id** — partial update; CONDUTOR may only update own packages (403 if `pkg.conductorId !== user.sub`); ADMIN unrestricted
- **DELETE /tenants/:slug/packages/:id** — soft-delete (`active: false`); same ownership rule

Body validated with Zod (`createPackageBodySchema` / `updatePackageBodySchema.partial()`). Invalid fields return `400 + errors array`. Unknown fields stripped by Zod.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|-----------|
| T-03-02-01 | Ownership check `pkg.conductorId !== user.sub` in PUT and DELETE |
| T-03-02-02 | `conductorId: user.sub` in POST — body schema excludes conductorId field |
| T-03-02-03 | All queries scoped to `tenantId: tenant.id` resolved from URL slug |
| T-03-02-04 | `updatePackageBodySchema = createPackageBodySchema.partial()` — Zod strips unknowns |
| T-03-02-05 | Accepted — GET already filters `active: true`; soft-deleted packages invisible |

## Known Stubs

None.

## Threat Flags

None — no new network surface beyond the 3 endpoints described in the plan's threat model.

## Self-Check: PASSED

- `apps/api/src/modules/packages/packages.routes.ts` — exists and modified
- commit b88589c — hasMinimumReached GET update
- commit 5901f84 — POST/PUT/DELETE write endpoints
- `npx tsc --noEmit` exits 0
