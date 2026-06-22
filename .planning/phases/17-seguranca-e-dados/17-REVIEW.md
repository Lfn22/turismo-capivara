---
phase: 17-seguranca-e-dados
reviewed: 2026-06-22T12:50:00-03:00
depth: standard
files_reviewed: 10
files_reviewed_list:
  - apps/api/src/modules/bookings/bookings.routes.ts
  - apps/api/src/modules/bookings/bookings.schemas.ts
  - apps/api/src/modules/webhooks/webhooks.routes.ts
  - apps/api/src/modules/packages/packages.routes.ts
  - apps/api/src/modules/bookings/emails/booking-created-email.ts
  - apps/web/app/[slug]/(painel)/painel/disponibilidade/page.tsx
  - apps/api/prisma/schema.prisma
  - apps/api/src/__tests__/cancel-self.test.ts
  - apps/api/src/__tests__/self-service.test.ts
  - apps/api/src/modules/bookings/emails/booking-created-email.test.ts
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-06-22T12:50:00-03:00
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

This phase shipped four security sub-tasks: tenant isolation on bookings, atomic cancel guard, webhook deduplication via `ProcessedWebhookEvent`, and a conductor approval gate. The core security flows are correct — tenant scoping, cancelToken lookup, HMAC signature validation with timing-safe compare, and `FOR UPDATE` row locking on booking creation are all properly implemented.

Two critical bugs remain: a race condition in the webhook dedup logic allows double-processing under concurrent webhook delivery, and the `repay` endpoint does not re-increment `slot.booked` when resetting an EXPIRED booking to PENDING, leaving the slot counter stale. Four warnings cover correctness gaps that could produce surprising behavior in edge cases.

---

## Critical Issues

### CR-01: Webhook deduplication has a TOCTOU race — double-processing possible under concurrent delivery

**File:** `apps/api/src/modules/webhooks/webhooks.routes.ts:106–199`

**Issue:** The dedup check (step 5, line 106) and the dedup record insertion (step 9, line 197) are separated by ~90 lines of async work including a Mercado Pago API call, a booking status update, and an email dispatch. If MP delivers the same webhook twice in rapid succession (which MP's retry policy does), both requests can pass the `findUnique` check before either one writes the `ProcessedWebhookEvent` row. Both will then execute the `booking.updateMany` and the `create` — the second `create` will crash with a unique-constraint error (the `ProcessedWebhookEvent.id` is `@id`), but the booking state transition will already have run twice.

For the `approved` path this is mostly harmless (the `updateMany` with `status: 'PENDING'` guard is idempotent after the first run). For the `cancelled/rejected` path the slot `booked` decrement runs inside a `$transaction` that reads `currentSlot.booked` and then sets `booked: { decrement: booking.pax }` — if two transactions overlap they both decrement, driving `booked` below zero (it is bounded by `Math.max(0, ...)` in `newBooked` but `booked: { decrement: booking.pax }` bypasses that guard and goes directly to Prisma's SQL decrement).

**Fix:** Move the dedup `create` to the top of the handler, before any side effects, using `upsert` or an atomic `createOrSkip` pattern via a unique-constraint catch:

```typescript
// Replace the two-phase check+insert with a single atomic upsert at the top,
// immediately after signature validation (before any booking logic).
try {
  await prisma.processedWebhookEvent.create({ data: { id: paymentId } })
} catch (e: any) {
  // P2002 = unique constraint violation — already processed
  if (e?.code === 'P2002') {
    return reply.status(200).send({ ok: true, deduplicated: true })
  }
  throw e
}
// Remove the findUnique check at line 106 and the create at line 197.
```

This makes the dedup atomic: only one of two concurrent requests will succeed at `create`; the other immediately returns 200.

---

### CR-02: `repay` endpoint does not re-increment `slot.booked` — slot counter permanently understated after repay

**File:** `apps/api/src/modules/bookings/bookings.routes.ts:509–545`

**Issue:** When an EXPIRED booking is reactivated via `/repay`, the slot's `booked` count was decremented when the booking expired (either by the expiry job or the webhook's `cancelled/rejected` path). The `repay` transaction (lines 521–537) locks the slot row and resets the booking to PENDING, but never re-increments `slot.booked`. After repay, the slot shows fewer occupants than reality. If this allows another booking to be created filling the same "phantom" capacity, two bookings will occupy one seat.

**Fix:** Inside the `$transaction` at line 521, after verifying `slotRow.status === 'OPEN'`, add an increment and recompute status:

```typescript
await prisma.$transaction(async (tx) => {
  const [slotRow] = await tx.$queryRaw<Array<{ status: string; booked: number; capacity: number }>>`
    SELECT status, booked, capacity FROM "DepartureSlot"
    WHERE id = ${booking.slotId}
    FOR UPDATE
  `
  if (!slotRow || slotRow.status !== 'OPEN') {
    throw new AppError('Slot indisponível para novo pagamento', 422)
  }
  // Guard against overbooking
  if (slotRow.booked + booking.pax > slotRow.capacity) {
    throw new AppError('Capacidade insuficiente', 422)
  }
  const newBooked = slotRow.booked + booking.pax
  await tx.departureSlot.update({
    where: { id: booking.slotId },
    data: {
      booked: { increment: booking.pax },
      status: newBooked >= slotRow.capacity ? 'FULL' : 'OPEN',
    },
  })
  await tx.booking.update({
    where: { id: booking.id },
    data: {
      paymentId: paymentResult.paymentId,
      paymentUrl: paymentResult.paymentUrl,
      qrCode: paymentResult.qrCode,
      expiresAt: paymentResult.expiresAt,
      status: 'PENDING',
    },
  })
})
```

---

## Warnings

### WR-01: `cancel` admin endpoint decrements `slot.booked` unconditionally — EXPIRED/already-released bookings will drive count negative

**File:** `apps/api/src/modules/bookings/bookings.routes.ts:616–648`

**Issue:** The admin `PATCH /:id/cancel` checks `!['PENDING', 'CONFIRMED'].includes(booking.status)` (line 632) and throws 400 for other statuses. However, EXPIRED bookings whose `booked` was already decremented by the webhook can have status `EXPIRED` which is correctly blocked. But CONFIRMED bookings that were paid and later cancelled via this endpoint will decrement `booked` — that is correct. The real concern is that the decrement is `{ decrement: booking.pax }` without a `Math.max(0, …)` floor, unlike the `cancel-self` path (line 401) which reads `currentSlot.booked` first and uses `Math.max`. If `booked` is already 0 (e.g., a data migration or manual override), Postgres will store a negative integer since the schema has no `@check(booked >= 0)` constraint.

**Fix:** Mirror the `cancel-self` pattern — read `currentSlot` first and set absolute value:

```typescript
const currentSlot = await tx.departureSlot.findUnique({ where: { id: booking.slotId } })
const newBooked = Math.max(0, (currentSlot?.booked ?? 0) - booking.pax)
await tx.departureSlot.update({
  where: { id: booking.slotId },
  data: {
    booked: newBooked,
    ...(currentSlot?.status === 'FULL' ? { status: 'OPEN' } : {}),
  },
})
```

---

### WR-02: `lookup` and `repay` rate-limit key uses email from unauthenticated request body — spoofable by omitting the field

**File:** `apps/api/src/modules/bookings/bookings.routes.ts:316–325` and `472–481`

**Issue:** The rate-limit `keyGenerator` on both `/lookup` and `/repay` reads `(req.body as { email?: string })?.email`. The Zod parse runs *after* the rate-limit plugin evaluates the key. If the body is sent without an `email` field, `keyGenerator` returns `'lookup:email:'` (empty suffix) — all requests without an email share a single bucket. An attacker can exhaust the rate limit for all unauthenticated users (DoS on lookup) by sending 5 requests with no email field and burning the shared empty-key bucket, or bypass their own per-email limit by omitting the field entirely.

**Fix:** Fall back to `req.ip` when email is absent:

```typescript
keyGenerator: (req) => {
  const email = ((req.body as { email?: string })?.email || '').trim().toLowerCase()
  return email ? `lookup:email:${email}` : `lookup:ip:${req.ip}`
}
```

---

### WR-03: Webhook `cancelled/rejected` path decrements slot inside transaction but without a `FOR UPDATE` lock — race with concurrent booking creation

**File:** `apps/api/src/modules/webhooks/webhooks.routes.ts:174–192`

**Issue:** The `$transaction` at line 174 reads `currentSlot` via `findUnique` (non-locking) and then updates `booked: { decrement: booking.pax }`. A concurrent booking creation request uses `FOR UPDATE` on the slot (bookings.routes.ts ~line 135), but the webhook transaction does not. Under high concurrency the two transactions can interleave: booking creation reads `booked=0, capacity=10`, increments to 1 and sets OPEN; simultaneously the webhook reads `booked=1`, decrements to 0 and sets OPEN. No data loss here, but if two webhooks fire simultaneously for the same cancelled booking (CR-01 covers this partially), both transactions decrement independently. A `SELECT … FOR UPDATE` on `DepartureSlot` inside the webhook transaction would serialize with booking creation:

```typescript
await prisma.$transaction(async (tx) => {
  await tx.booking.update({ where: { id: booking.id }, data: { status: 'EXPIRED' } })
  const [currentSlot] = await tx.$queryRaw<Array<{booked:number; status:string; capacity:number}>>`
    SELECT booked, status, capacity FROM "DepartureSlot"
    WHERE id = ${booking.slotId}
    FOR UPDATE
  `
  const newBooked = Math.max(0, (currentSlot?.booked ?? booking.pax) - booking.pax)
  // ... rest of update
})
```

---

### WR-04: `disponibilidade/page.tsx` sends slot creation without `minCapacity` — backend will reject with 400 but UI shows no validation error for this field

**File:** `apps/web/app/[slug]/(painel)/painel/disponibilidade/page.tsx:197–207`

**Issue:** The `handleCreateSlot` function posts `{ startsAt, capacity: formVagas }` (line 204). The `createSlotBodySchema` on the backend requires `minCapacity` (packages.routes.ts line 62). The request will always return 400 with `{ code: 'SLOT_DATE_PAST' }` or a generic validation error. The UI catches the error and displays `formApiError` — users will see a cryptic "Dados inválidos" message with no indication that `minCapacity` is missing. There is also no `minCapacity` input in the form.

**Fix:** Add a `minCapacity` field to the form and include it in the POST body:

```typescript
// Add state
const [formMinVagas, setFormMinVagas] = useState<number>(1)

// In POST body:
body: JSON.stringify({ startsAt, capacity: formVagas, minCapacity: formMinVagas }),

// Add validation in validateForm():
if (formMinVagas < 1) errs.minVagas = 'Informe ao menos 1 vaga mínima.'
if (formMinVagas > formVagas) errs.minVagas = 'Mínimo não pode exceder máximo.'
```

---

## Info

### IN-01: `createBookingBodySchema` does not strip CPF formatting characters before regex validation

**File:** `apps/api/src/modules/bookings/bookings.routes.ts:47–51`

**Issue:** The regex `^\d{11}$` requires exactly 11 raw digits. Common Brazilian CPF formats from frontend inputs use dots and hyphens (`123.456.789-09`). A frontend sending a formatted CPF will get a 400 even though the CPF is structurally valid. Consider whether the API contract explicitly requires pre-stripped CPF (document it) or add a `.transform()` to strip punctuation before the regex.

---

### IN-02: `booking.cancelToken` is typed `String @unique` in schema but the `Booking` model has no `@default` — the field is required at create time with no fallback

**File:** `apps/api/prisma/schema.prisma` (Booking model, `cancelToken` field)

**Issue:** The field has no `@default(cuid())` or similar. Creation relies on the application always passing `cancelToken: randomBytes(32).toString('hex')`. Any future code path that calls `booking.create` without explicitly setting `cancelToken` will fail at the Prisma layer with a required-field error rather than a clear application error. This is low risk given the current single creation site, but worth documenting.

---

### IN-03: `self-service.test.ts` — `/repay` test does not assert that `slot.booked` was incremented

**File:** `apps/api/src/__tests__/self-service.test.ts:183–200`

**Issue:** The repay success test asserts `qrCode` and `paymentUrl` in the response but does not verify `departureSlot.update` was called with `booked: { increment: booking.pax }`. Given CR-02 above (the real code does *not* increment), this gap means the test cannot catch the regression. Adding a `expect(db.departureSlot.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ booked: { increment: 2 } }) }))` assertion would have surfaced CR-02 during development.

---

_Reviewed: 2026-06-22T12:50:00-03:00_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
