---
phase: 03-roteiros-e-disponibilidade
plan: "03"
subsystem: packages-slots
tags: [slots, departure-slots, calendar, transactions, cascade-cancel]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [slot-create, slot-update, slot-cancel-cascade]
  affects: [packages.routes.ts, bookings]
tech_stack:
  added: []
  patterns: [prisma.$transaction cascade, Zod cross-field refine, CONDUTOR ownership check inside transaction]
key_files:
  modified:
    - apps/api/src/modules/packages/packages.routes.ts
decisions:
  - Ownership check inside $transaction for DELETE — makes auth atomic with mutation (prevents TOCTOU)
  - updateMany filtered strictly to status PENDING — CONFIRMED bookings never touched automatically
  - Idempotency guard (slot.status === CANCELLED → 400) inside transaction — prevents double-cancel race
metrics:
  duration: 83s
  completed: "2026-04-30"
  tasks_completed: 2
  files_modified: 1
---

# Phase 3 Plan 03: Slot Management Endpoints Summary

**One-liner:** POST/PATCH/DELETE slot endpoints under /packages/:id/slots with Zod cross-field minCapacity validation and atomic cascade cancellation via prisma.$transaction.

## What Was Built

Three new slot management endpoints added to `packages.routes.ts`:

1. **POST /tenants/:slug/packages/:id/slots** — creates a DepartureSlot; validates minCapacity <= capacity via Zod .refine(); enforces CONDUTOR ownership (conductorId === user.sub).

2. **PATCH /tenants/:slug/packages/:id/slots/:slotId** — partial update of slot fields (startsAt, capacity, minCapacity); enforces ownership; cross-package slotId access blocked via slot.package.id === params.id check.

3. **DELETE /tenants/:slug/packages/:id/slots/:slotId** — sets slot to CANCELLED and cascades cancellation of all PENDING bookings for that slot in a single prisma.$transaction. CONFIRMED bookings are never touched. Idempotency guard returns 400 if slot already CANCELLED.

New schemas added (module-level, before packagesRoutes):
- `slugIdAndSlotIdParamsSchema` — 3-param route parsing
- `createSlotBodySchema` — with .refine() for minCapacity <= capacity
- `updateSlotBodySchema` — conditional .refine() when both fields present

Total routes in file: 8 (2 GETs + 3 package writes + 3 slot writes).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: POST + PATCH slots | 79960ed | feat(03-03): add POST and PATCH slot endpoints with minCapacity Zod validation |
| Task 2: DELETE slot cascade | 74211ba | feat(03-03): add DELETE slot endpoint with cascade booking cancellation via $transaction |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Coverage

All threats from plan's threat_model addressed:

| Threat | Mitigation Applied |
|--------|--------------------|
| T-03-03-01 Elevation of Privilege | conductorId !== user.sub enforced in all 3 endpoints; DELETE check inside transaction |
| T-03-03-02 Tampering (booking scope) | updateMany explicitly filters `status: 'PENDING'` |
| T-03-03-03 Tampering (minCapacity > capacity) | Zod .refine() on createSlotBodySchema and updateSlotBodySchema |
| T-03-03-04 DoS double-cancel race | Idempotency guard inside $transaction |
| T-03-03-05 Cross-package slot access | slot.package.id !== params.id check present in PATCH and DELETE |

## Known Stubs

None.

## Self-Check: PASSED

- `apps/api/src/modules/packages/packages.routes.ts` — modified and committed
- Commit 79960ed exists: `git log --oneline | grep 79960ed` ✓
- Commit 74211ba exists: `git log --oneline | grep 74211ba` ✓
- `npx tsc --noEmit` exits 0 ✓
- 8 route registrations confirmed ✓
- prisma.$transaction: 1 match ✓
- bookingsCancelled: 1 match ✓
- status: 'PENDING': 1 match ✓
- Slot já cancelado: 1 match ✓
