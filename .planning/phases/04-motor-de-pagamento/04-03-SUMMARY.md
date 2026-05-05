---
phase: 04-motor-de-pagamento
plan: 03
subsystem: payments/webhooks
tags: [mercadopago, webhook, hmac, booking-transitions, idempotency]
one_liner: "Mercado Pago webhook handler with HMAC-SHA256 validation and PENDING→CONFIRMED/EXPIRED booking transitions"

dependency_graph:
  requires:
    - 04-01  # rawBody plugin, BookingStatus EXPIRED, schema fields
    - 04-02  # external_reference set to bookingId at payment creation
  provides:
    - POST /webhooks/mercadopago (public, HMAC-protected)
    - Automatic booking confirmation on MP payment approved
    - Slot release on payment cancelled/rejected
  affects:
    - apps/api/src/app.ts
    - Booking.status transitions
    - DepartureSlot.booked (decremented on EXPIRED)

tech_stack:
  added: []
  patterns:
    - HMAC-SHA256 signature validation (crypto.timingSafeEqual)
    - MP x-signature header parsing (ts= v1= format)
    - external_reference booking lookup (race-condition safe)
    - prisma.$transaction for atomic EXPIRED + slot release
    - Idempotency guard on terminal booking states

key_files:
  created:
    - apps/api/src/modules/webhooks/webhooks.routes.ts
  modified:
    - apps/api/src/app.ts

decisions:
  - "Used external_reference (bookingId) for booking lookup — avoids race condition where webhook arrives before paymentId is stored in booking row"
  - "Return 200 on MP fetch failure to prevent retry flood"
  - "action field from webhook body not used for routing — MP API status is authoritative"
  - "rawBody not used in HMAC computation — manifest is id:<paymentId>;request-date:<ts>; per MP 2024+ spec"
  - "EXPIRED transition wrapped in $transaction with slot.booked decrement for atomicity"

metrics:
  duration_minutes: 15
  completed_date: "2026-05-05"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 4 Plan 03: Webhook Handler Summary

Mercado Pago webhook handler with HMAC-SHA256 validation and booking status transitions (PENDING→CONFIRMED, PENDING→EXPIRED).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create webhooks module with HMAC validation and booking transitions | 0393b8c | apps/api/src/modules/webhooks/webhooks.routes.ts |
| 2 | Register webhooksRoutes in app.ts | 1c10f3c | apps/api/src/app.ts |

## What Was Built

`POST /webhooks/mercadopago` — publicly accessible endpoint protected exclusively by HMAC-SHA256 signature validation (no JWT).

**Signature validation flow:**
1. Read `x-signature` header — 400 if absent
2. Parse `ts=<timestamp>,v1=<hash>` fields from header
3. Build manifest: `id:<paymentId>;request-date:<ts>;`
4. Compute HMAC-SHA256 over manifest using `MP_WEBHOOK_SECRET`
5. Compare with `crypto.timingSafeEqual` — 400 if mismatch

**Business logic flow:**
1. Validate signature (above)
2. Extract `data.id` (paymentId) from body — 400 if absent
3. Fetch payment from MP API using paymentId — 200 on MP failure (prevents retry flood)
4. Look up booking by `external_reference` (= bookingId set at creation in 04-02)
5. Idempotency check: already CONFIRMED or EXPIRED → 200 immediately
6. Transition based on MP payment status:
   - `approved` → booking PENDING→CONFIRMED
   - `cancelled` / `rejected` → booking PENDING→EXPIRED + `departureSlot.booked` decremented in `$transaction`
   - Other statuses (pending, in_process) → no-op, 200

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all transitions wired to real DB operations.

## Threat Flags

None beyond what the plan's threat model already covers. All T-04-03-xx mitigations implemented:
- T-04-03-01: HMAC validation before any business logic
- T-04-03-02: `timingSafeEqual` prevents timing oracle
- T-04-03-04: `MP_WEBHOOK_SECRET` startup guard
- T-04-03-05: Idempotency check on terminal states
- T-04-03-06: 400 on invalid signature, no partial processing

## Self-Check: PASSED

- apps/api/src/modules/webhooks/webhooks.routes.ts: FOUND
- apps/api/src/app.ts contains `webhooksRoutes`: FOUND
- Commits 0393b8c and 1c10f3c: FOUND in git log
