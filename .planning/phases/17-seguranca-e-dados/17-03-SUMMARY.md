---
phase: 17
plan: "03"
subsystem: bookings
tags: [security, tenant-isolation, atomic-cancel, approval-gate]
dependency_graph:
  requires: []
  provides: [tenant-isolation-cancel-confirm, atomic-bookedcount-decrement, booking-approval-gate]
  affects: [bookings.routes.ts]
tech_stack:
  added: []
  patterns: [prisma.$transaction, AppError-2-param]
key_files:
  created: []
  modified:
    - apps/api/src/modules/bookings/bookings.routes.ts
decisions:
  - "D-12: 403 message on unapproved tenant is generic ('Reservas indisponíveis no momento.') — do not expose real reason"
  - "AppError constructor is 2-param only — no third 'code' argument"
metrics:
  duration: "~10min"
  completed: "2026-06-22T12:40:00Z"
  tasks_completed: 3
  tasks_total: 3
---

# Phase 17 Plan 03: Booking Security Summary

Tenant isolation em confirm/cancel, decremento atômico de bookedCount, e gate de aprovação de tenant no booking — protege contra cross-tenant e double-cancel sem liberar slot.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Tenant isolation on confirm/cancel | 1c6b106 | bookings.routes.ts |
| 2 | Double-cancel guard + atomic bookedCount decrement | 1c6b106 | bookings.routes.ts |
| 3 | Tenant approval gate on POST /bookings | 1c6b106 | bookings.routes.ts |

## What Was Built

**Task 1 — Tenant isolation:**
- Both `PATCH /cancel` and `PATCH /confirm` now cast `request.user` as `{ sub, role, tenantId }` and enforce `booking.tenantId === user.tenantId` (throws `AppError('FORBIDDEN', 403)` on mismatch).

**Task 2 — Atomic cancel:**
- Added `BOOKING_ALREADY_CANCELLED` guard (400) before `$transaction` in the staff cancel handler.
- The `$transaction` already atomically decrements `booked` and restores slot to `OPEN` if it was `FULL` — no structural change needed.

**Task 3 — Approval gate:**
- After fetching tenant in `POST /tenants/:slug/bookings`, checks `tenant.approvalStatus !== 'APPROVED'` and throws `AppError('Reservas indisponíveis no momento.', 403)` — generic message per D-12.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AppError called with 3 arguments (constructor only accepts 2)**
- **Found during:** Task 1 commit review
- **Issue:** Uncommitted Task 1 code had `new AppError('FORBIDDEN', 403, 'Acesso negado')` in both cancel and confirm handlers — TypeScript constructor signature is `(message: string, statusCode = 400)`, third arg silently ignored but indicates intent mismatch.
- **Fix:** Removed third argument — `new AppError('FORBIDDEN', 403)` in both handlers.
- **Files modified:** apps/api/src/modules/bookings/bookings.routes.ts
- **Commit:** 1c6b106

## Known Stubs

None.

## Threat Flags

None — no new network endpoints or auth paths introduced. Changes harden existing endpoints.

## Self-Check: PASSED

- `apps/api/src/modules/bookings/bookings.routes.ts` — exists and modified
- Commit `1c6b106` — confirmed in git log
- TypeScript: `tsc --noEmit` passed with no errors
