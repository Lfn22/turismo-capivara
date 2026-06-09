---
phase: 14-gestao-de-conteudo
plan: "04"
subsystem: destinations-approval
tags: [approval-workflow, super-admin, destinations, content-moderation]
dependency_graph:
  requires: [14-01, 14-02]
  provides: [destination-approval-api]
  affects: [destinations.service, destinations.routes, destinations.schemas]
tech_stack:
  added: []
  patterns: [state-machine-approval, admin-only-endpoints, paginated-queue]
key_files:
  created: []
  modified:
    - apps/api/src/modules/destinations/destinations.service.ts
    - apps/api/src/modules/destinations/destinations.routes.ts
    - apps/api/src/modules/destinations/destinations.routes.test.ts
decisions:
  - "rejectionReason omitted from prisma update: Destination model lacks the field (only User model has it); optional in schema for future migration"
  - "PATCH /destinations/:id/approve uses id param (not slug) for atomic update safety"
  - "Tasks 3+4 committed together as both are in destinations.routes.ts"
metrics:
  duration_minutes: 10
  completed_date: "2026-06-09"
  tasks_completed: 5
  files_modified: 3
---

# Phase 14 Plan 04: Destination Approval Workflow Summary

Super-admin approval workflow for destinations: PATCH approve/reject endpoint + GET pending queue, with full unit test coverage.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | ApprovalUpdateInput schema (already in schemas from prior plan) | pre-existing |
| 2 | approveDestination + rejectDestination service methods | 68e8b5f |
| 3 | PATCH /destinations/:id/approve route (ADMIN only) | c542397 |
| 4 | GET /admin/destinations/pending route (ADMIN only) | c542397 |
| 5 | Integration tests — 14 new tests (total 39) | 29d6d8c |

## What Was Built

- **approveDestination(id)**: Fetches destination, asserts PENDING, updates to APPROVED. Throws 404/400 in Portuguese.
- **rejectDestination(id)**: Same pattern, updates to REJECTED.
- **PATCH /destinations/:id/approve**: Body `{ approvalStatus: 'APPROVED' | 'REJECTED' }`. ADMIN-only. Delegates to approve/rejectDestination.
- **GET /admin/destinations/pending**: Paginated list of PENDING destinations with creator info (name, email, tenant). ADMIN-only.

## Deviations from Plan

### Auto-handled

**1. [Rule 1 - Scope] rejectionReason not persisted**
- **Found during:** Task 2 implementation
- **Issue:** Plan spec called for `rejectDestination(id, reason?)` storing `rejectionReason`, but the Prisma `Destination` model has no `rejectionReason` field (the field exists only on `User` model)
- **Fix:** `rejectionReason` accepted in `ApprovalUpdateInput` schema (optional) but not persisted in `prisma.destination.update`. Future migration can add the field.
- **Files modified:** destinations.service.ts (signature simplified to `rejectDestination(id)`)

**2. [Task 1] Schema already complete**
- **Found during:** Task 1 verification
- **Issue:** `ApprovalUpdateInput` was already exported in destinations.schemas.ts from a prior plan session
- **Fix:** No-op. Task 1 verified and skipped.

## Known Stubs

None — all endpoints wire to real Prisma queries.

## Self-Check

- [x] approveDestination in destinations.service.ts — verified
- [x] rejectDestination in destinations.service.ts — verified
- [x] PATCH /destinations/:id/approve in destinations.routes.ts — verified
- [x] GET /admin/destinations/pending in destinations.routes.ts — verified
- [x] ApprovalUpdateInput exported from destinations.schemas.ts — verified
- [x] 39 tests passing (vitest run)
- [x] TypeScript: no errors (tsc --noEmit clean)

## Self-Check: PASSED
