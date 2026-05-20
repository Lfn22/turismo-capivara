---
phase: "09"
plan: "03"
subsystem: bookings/cron
tags: [cron, expiry, advisory-lock, prisma-transaction, fire-and-forget-email]
dependency_graph:
  requires:
    - "09-01"  # fastify-cron infrastructure in app.ts
    - "09-02"  # booking-expired-email template
  provides:
    - booking-expiry-automation
  affects:
    - apps/api/src/app.ts
    - apps/api/src/modules/bookings/
tech_stack:
  added: []
  patterns:
    - PostgreSQL advisory lock (pg_try_advisory_lock / pg_advisory_unlock)
    - prisma.$transaction for atomic booking expiry + slot release
    - Fire-and-forget email with .catch() (never reverts DB transaction)
key_files:
  created:
    - apps/api/src/modules/bookings/expiry.job.ts
  modified:
    - apps/api/src/app.ts
decisions:
  - "Advisory lock ID 1_234_567_890 is a server-side constant — not user-controllable"
  - "onTick takes no arguments — app instance passed via closure from factory (fastify-cron v2+)"
  - "Email failure logs warn but does not revert booking expiry (D-12)"
  - "Lock released in finally block — guarantees unlock even if batch throws"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-20"
  tasks_completed: 2
  files_modified: 2
---

# Phase 9 Plan 03: Booking Expiry Cron Job Summary

Cron job that expires PENDING bookings past expiresAt, using PostgreSQL advisory lock and atomic prisma.$transaction for slot release, with fire-and-forget NOTIF-04 email.

## What Was Built

`expiry.job.ts` exports `createBookingExpiryJob(app)` — a factory returning a fastify-cron job config. Every minute it:

1. Acquires `pg_try_advisory_lock(1_234_567_890)` — skips run if another instance holds it
2. Queries all `PENDING` bookings where `expiresAt <= NOW()`
3. For each booking: atomically sets `status = 'EXPIRED'` and decrements `slot.booked` (slot status recalculated) via `prisma.$transaction`
4. Sends NOTIF-04 expiry email fire-and-forget (`.catch()` — never reverts expiry)
5. Releases lock in `finally` block

`app.ts` updated: `jobs: []` placeholder replaced with `jobs: [createBookingExpiryJob(app)]`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create expiry.job.ts | ca26136 | apps/api/src/modules/bookings/expiry.job.ts |
| 2 | Wire expiry job into app.ts | c514826 | apps/api/src/app.ts |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints or auth paths introduced. Cron runs server-side only, no HTTP exposure. All threats covered by plan's threat model (T-09-03-01 through T-09-03-05).

## Self-Check: PASSED

- `apps/api/src/modules/bookings/expiry.job.ts` — exists, exports `createBookingExpiryJob`
- `apps/api/src/app.ts` — contains import + `jobs: [createBookingExpiryJob(app)]`
- `jobs: []` — no longer present in app.ts
- TypeScript: `pnpm --filter @turismo/api exec tsc --noEmit` — exit 0
- Commits ca26136 and c514826 verified in git log
