---
phase: 09-booking-lifecycle-automation
plan: "04"
subsystem: bookings/webhooks/email
tags: [notifications, email, expiresAt, NOTIF-01, NOTIF-02, fire-and-forget]
dependency_graph:
  requires: ["09-02"]
  provides: [NOTIF-01, NOTIF-02]
  affects: [bookings.routes.ts, webhooks.routes.ts]
tech_stack:
  added: []
  patterns: [fire-and-forget email, getResend helper, BOOKING_EXPIRY_MINUTES env var]
key_files:
  modified:
    - apps/api/src/modules/bookings/bookings.routes.ts
    - apps/api/src/modules/webhooks/webhooks.routes.ts
    - apps/api/.env.example
decisions:
  - "expiresAt set locally from BOOKING_EXPIRY_MINUTES at tx.booking.create — not from Mercado Pago response (D-06)"
  - "Both email sends use fire-and-forget .catch() — email failures never block booking transactions (D-12)"
  - "meetingPoint passed as null — schema has no meetingPoint field; template handles null gracefully"
metrics:
  duration: "~10min"
  completed: "2026-05-20"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 9 Plan 04: Email Notifications (NOTIF-01 + NOTIF-02) Summary

Email transactional notifications wired into booking creation and webhook approval. expiresAt now sourced from local BOOKING_EXPIRY_MINUTES config instead of Mercado Pago response.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix expiresAt + send NOTIF-01 | 25ee0ae | bookings.routes.ts |
| 2 | Send NOTIF-02 on webhook approval + .env.example | 263a34c | webhooks.routes.ts, .env.example |

## What Was Built

**Task 1 — bookings.routes.ts:**
- Added `import { Resend } from 'resend'` and `bookingCreatedEmailText/bookingCreatedSubject` imports
- Added `getResend()` helper (no-op when RESEND_API_KEY absent)
- `expiresAt` now calculated as `new Date(Date.now() + expiryMinutes * 60_000)` inside `tx.booking.create` using `BOOKING_EXPIRY_MINUTES` env var (default 30)
- Removed `expiresAt: paymentResult.expiresAt` from the post-MP `booking.update`
- NOTIF-01 fire-and-forget send after successful PIX payment init — sends PIX qrCode, paymentUrl, and deadline to customerEmail

**Task 2 — webhooks.routes.ts:**
- Added `Resend` import and `bookingConfirmedEmailText/bookingConfirmedSubject` imports
- Added `getResend()` helper
- Expanded `prisma.booking.findFirst` to `include: { slot: { include: { package: { select: { name, conductor: { name } } } } } }` to gather email data
- NOTIF-02 fire-and-forget send inside `if (status === 'approved')` block after `updateMany` — sends confirmation email with package name, guide name, startsAt

**apps/api/.env.example:**
- Appended `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `RESEND_API_KEY`, `BOOKING_EXPIRY_MINUTES=30`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — email templates are fully wired. `meetingPoint: null` is intentional (no schema field); template renders empty line gracefully.

## Threat Flags

No new security surface beyond the plan's threat model. All T-09-04-xx threats reviewed — all accepted per plan.

## Self-Check: PASSED

- `apps/api/src/modules/bookings/bookings.routes.ts` — confirmed contains BOOKING_EXPIRY_MINUTES, bookingCreatedEmailText, expiresAt * 60_000
- `apps/api/src/modules/webhooks/webhooks.routes.ts` — confirmed contains bookingConfirmedEmailText, conductor select, fire-and-forget .catch()
- `apps/api/.env.example` — confirmed contains BOOKING_EXPIRY_MINUTES=30
- TypeScript: `pnpm --filter @turismo/api exec tsc --noEmit` → exit 0
- Commits 25ee0ae and 263a34c exist in git log
