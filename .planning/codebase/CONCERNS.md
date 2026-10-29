# Codebase Concerns

**Analysis Date:** 2026-09-04

## Tech Debt

### WR-002: Query Performance — Full-Table Scans on Booking Lookups

**Issue:** Booking lookup endpoints use `.endsWith()` on the `id` field without an index, generating inefficient `LIKE '%suffix'` SQL queries that perform full-table scans.

**Files:** 
- `apps/api/src/modules/bookings/bookings.routes.ts:340` (lookup endpoint)
- `apps/api/src/modules/bookings/bookings.routes.ts:492` (repay endpoint)

**Impact:** 
- In production with high booking volume, these queries become O(n) and degrade database performance
- Both endpoints are rate-limited (5 req/15min and 5 req/15min) but still vulnerable to sustained load
- Each query scans the entire booking table before filtering

**Current Code:**
```typescript
const booking = await prisma.booking.findFirst({
  where: {
    id: { endsWith: code.toLowerCase() },
    tenantId: tenant.id,
  },
  orderBy: { createdAt: 'desc' },
  ...
})
```

**Fix Approach:**
1. Add a new `code String @unique @db.VarChar(8)` field to `Booking` model in `apps/api/prisma/schema.prisma`
2. During booking creation in `apps/api/src/modules/bookings/bookings.routes.ts:204`, extract last 8 chars of `bookingId` and store separately
3. Update lookups to query by `code` instead of `id: { endsWith: ... }`
4. Add `@@index([tenantId, code])` compound index for multi-tenant queries
5. Backfill existing bookings via migration

**Migration Path:** Backward-compatible if code is populated before deploy; old endsWith queries can coexist during transition window.

---

### Database Query Logging in Production

**Issue:** `apps/api/src/database.ts:11` logs `['query', 'error', 'warn']` for all Prisma operations. In production, this writes every SQL statement to logs, impacting performance and increasing storage costs.

**Files:** `apps/api/src/database.ts:11`

**Impact:**
- Reduces throughput due to I/O overhead
- Increases observability costs (Sentry or cloud logging)
- May leak query details (identifiable data patterns) in logs

**Current Code:**
```typescript
const prisma = new PrismaClient({
  adapter,
  log: ['query', 'error', 'warn'],
})
```

**Fix Approach:**
1. Change to `log: ['error', 'warn']` (remove 'query' in production)
2. Use environment variable to conditionally enable query logs in development only:
   ```typescript
   const prisma = new PrismaClient({
     adapter,
     log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error', 'warn'],
   })
   ```

---

### Redundant Guide Profile Query in Slot Creation

**Issue:** In slot creation endpoint, `guideProfile` is fetched twice in rapid succession.

**Files:** `apps/api/src/modules/packages/packages.routes.ts:445-448` and `486-489`

**Impact:** Minor redundant database call during conflict detection; already validated before transaction.

**Current Code:**
```typescript
// First query (line 445-448) — validates guide belongs to tenant
const guideOwner = await prisma.guideProfile.findUnique({
  where: { id: body!.guideId },
  select: { user: { select: { tenantId: true } } },
})

// Second query (line 486-489) — inside transaction for error message
const guideProfile = await tx.guideProfile.findUnique({
  where: { id: body!.guideId },
  select: { user: { select: { name: true } } },
})
```

**Fix Approach:** Cache first query result with both `tenantId` and `name` fields; reuse inside transaction.

---

## Known Bugs

### Potential Multi-Tenant Isolation Edge Case in Slot Status Transitions

**Issue:** Slot status can transition from FULL → OPEN during booking cancellation without verifying the booking's tenant matches the slot's tenant explicitly.

**Files:** 
- `apps/api/src/modules/bookings/bookings.routes.ts:425-441` (cancel-self endpoint)
- `apps/api/src/modules/bookings/bookings.routes.ts:677-692` (admin cancel endpoint)

**Trigger:** 
1. Attacker creates booking in tenant A
2. Attacker cancels using self-service flow with token
3. System releases slot seats without re-verifying tenant affiliation

**Current Mitigation:** 
- `cancel-self` uses `cancelToken` which is per-booking and unique (@@unique constraint)
- Admin cancel endpoint uses JWT tenant verification via `authenticate` middleware
- Slot release uses `booking.slotId` which is immutable

**Assessment:** LOW RISK — The `cancelToken` approach is secure (unguessable 64-char hex string). Tenant isolation verified at booking creation and JWT level. But explicit assertion would be safer.

**Safe Modification:** Add explicit tenant check before slot update in both cancel endpoints:
```typescript
if (booking.tenantId !== tenant.id) {
  throw new AppError('Tenant mismatch', 403)
}
```

---

### Overbooking Race Condition — Theoretical Window

**Issue:** Slot availability check uses `FOR UPDATE` locking but theoretically a third concurrent transaction could slip between check and increment.

**Files:** `apps/api/src/modules/bookings/bookings.routes.ts:136-176` (POST /bookings)

**Current Code:**
```typescript
await prisma.$transaction(async (tx) => {
  const [slot] = await tx.$queryRaw`
    SELECT ... FROM "DepartureSlot" ds
    ... WHERE ds.id = ${slotId}
    FOR UPDATE  // Row-level lock acquired
  `
  if (slot.booked + pax > slot.capacity) {
    throw new AppError('Capacidade insuficiente', 400)
  }
  await tx.departureSlot.update({
    where: { id: slotId },
    data: { booked: { increment: pax } },
  })
})
```

**Assessment:** NO ISSUE — `FOR UPDATE` within a transaction prevents concurrent modifications. PostgreSQL serialization is guaranteed within a single transaction boundary. This is correctly implemented.

---

## Security Considerations

### Public Booking Self-Service Endpoints Rely on Secrets for Auth

**Issue:** Endpoints `/tenants/:slug/bookings/cancel-self` and `/tenants/:slug/bookings/lookup` are public (no JWT) and rely on email + code/token for authentication.

**Files:**
- `apps/api/src/modules/bookings/bookings.routes.ts:315-378` (lookup)
- `apps/api/src/modules/bookings/bookings.routes.ts:380-465` (cancel-self)
- `apps/api/src/modules/bookings/bookings.routes.ts:467-580` (repay)

**Secrets Used:**
- `bookingId` (internal UUID, used as lookup code) — guessable given sequential IDs (unlikely but possible)
- `cancelToken` (unique, 64-char hex, cryptographically secure) — secure
- Customer email (not secret)

**Current Mitigations:**
- Rate limits: 5 req/15min per IP on lookup/repay, 3 req/15min on cancel
- Email verification required (customer email must match)
- Opaque errors (no leak of whether email or code failed)

**Risk Assessment:** MEDIUM — For `bookingId` lookup (endsWith code), an attacker could brute-force the last 8 characters. Add `code` field (WR-002 fix) and implement exponential backoff on failures.

**Recommendation:**
1. Add dedicated `code` field (8-char random alphanumeric) to Booking model
2. Increase lookup rate limits if automated API usage is expected
3. Log failed lookup attempts with timestamp/IP for monitoring

---

### CORS Default Fallback to Localhost

**Issue:** `apps/api/src/app.ts:52` falls back to `http://localhost:3000` if `CORS_ORIGIN` env var is not set.

**Files:** `apps/api/src/app.ts:51-54`

**Current Code:**
```typescript
app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
})
```

**Risk:** 
- If deployed without setting `CORS_ORIGIN`, local attackers can make requests via `http://localhost:3000`
- May expose API to localhost-running malware

**Mitigation:** 
- Env validation in `apps/api/src/shared/env.ts:26-33` requires `CORS_ORIGIN` in production
- Fallback only affects development

**Assessment:** LOW RISK — Environment validation enforces CORS_ORIGIN in production. Fallback is appropriate for local development.

---

### Webhook Signature Validation Timing

**Issue:** Webhook deduplication in `apps/api/src/modules/webhooks/webhooks.routes.ts:104-118` relies on unique constraint on `paymentId` alone.

**Files:** `apps/api/src/modules/webhooks/webhooks.routes.ts:104-118`

**Assessment:** SECURE — Deduplication is atomic via Prisma unique constraint. Concurrent deliveries of the same webhook will race; one wins and creates `ProcessedWebhookEvent`, others get P2002 and return 200 (deduped).

---

## Performance Bottlenecks

### Booking List Query Without Pagination

**Issue:** `GET /tenants/:slug/bookings` endpoint loads ALL bookings for a tenant without pagination.

**Files:** `apps/api/src/modules/bookings/bookings.routes.ts:751-793`

**Current Code:**
```typescript
const bookings = await prisma.booking.findMany({
  where: { tenantId: tenant.id },
  select: { ... },
  orderBy: { createdAt: 'desc' },
})
```

**Impact:** 
- With 10,000+ bookings, response payload and memory usage balloon
- No cursor-based or offset-based pagination

**Fix Approach:** Add optional `limit` and `cursor` query parameters; implement cursor-based pagination per Relay spec.

---

### Slot Conflict Detection — O(m*n) String Formatting

**Issue:** In `apps/api/src/modules/packages/packages.routes.ts:475-498`, guide schedule conflict check loops over existing slots and formats dates per booking for error message.

**Files:** `apps/api/src/modules/packages/packages.routes.ts:483-485`

**Current Code:**
```typescript
for (const existing of existingSlots) {
  // ... overlap check ...
  const fmt = (d: Date) =>
    d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', ... })
  
  const existingEndDate = new Date(existingEndMs)
  throw new ScheduleConflictError(
    ...,
    `Guia ${guideName} já tem compromisso com roteiro '${existing.package.name}' das ${fmt(existing.startsAt)} até ${fmt(existingEndDate)}`
  )
}
```

**Impact:** O(m) date formatting on conflict detection. If guide has many slots, wasteful on each conflict check.

**Fix Approach:** Format dates only when throwing error (already done); no action needed, pattern is acceptable.

---

### Missing Pagination in Guide Discovery Endpoints

**Issue:** `GET /guides` and destination guide endpoints load all approved guides without pagination.

**Files:**
- `apps/api/src/modules/guides/guides.routes.ts:317-343`
- `apps/api/src/modules/destinations/destinations.routes.ts` (guides list)

**Impact:** Scales linearly with guide count; UI must load/render all records.

**Fix Approach:** Add cursor-based pagination or limit + offset with `take`/`skip` in Prisma queries.

---

## Fragile Areas

### Booking Expiry Cron Job — Single-Instance Lock Assumption

**Issue:** `apps/api/src/modules/bookings/expiry.job.ts` uses PostgreSQL advisory lock to prevent multi-instance races.

**Files:** `apps/api/src/modules/bookings/expiry.job.ts:6-19`

**Why Fragile:**
- Advisory lock is released even if job crashes (finally block ensures cleanup)
- If lock release fails (DB connection lost), next instance waits 60s for lock timeout
- No alerting if lock fails

**Safe Modification:**
1. Add Sentry alert if `pg_try_advisory_lock` returns false (indicates another instance already running)
2. Add separate alert if lock release fails
3. Document expected behavior in code comment

**Current Mitigation:** Cron runs hourly, so 1-hour processing delay is acceptable if lock fails.

---

### Email Notification Fire-and-Forget Pattern

**Issue:** Email sending in booking endpoints uses `.catch()` to log failures but does not retry or queue.

**Files:**
- `apps/api/src/modules/bookings/bookings.routes.ts:256-276` (booking created)
- `apps/api/src/modules/bookings/bookings.routes.ts:279-297` (guide notification)
- `apps/api/src/modules/bookings/expiry.job.ts:89-108` (expiry notification)

**Impact:** Email failures are silent; customers may not receive critical booking confirmations.

**Safe Modification:**
1. Add queue (Bull, Inngest) for email retry with exponential backoff
2. Log email failures to Sentry with booking ID for manual follow-up

**Current Mitigation:** Resend retries internally; failures are low-likelihood in practice.

---

### Password Reset Token Hash Lookup Without Index

**Issue:** `apps/api/src/modules/auth/routes/reset-password.ts` queries `PasswordResetToken` by `hashedToken`, but only indexed by `userId`.

**Files:** `apps/api/prisma/schema.prisma:179` — only `@@index([userId])`

**Impact:** Lookup by token performs table scan (low risk due to small table, but inefficient).

**Fix Approach:** Add `@@index([hashedToken])` or `hashedToken: String @unique` to schema.

---

## Scaling Limits

### Overbooking Prevention via Row Locking

**Issue:** `POST /bookings` uses `FOR UPDATE` row lock on slot. High concurrency (>10 simultaneous bookings) may cause lock contention.

**Assessment:** PostgreSQL handles lock queuing efficiently; expected behavior. No issue unless sustained 1000+ concurrent bookings for same slot (rare in practice).

---

### Webhook Processing Batch Loop

**Issue:** `apps/api/src/modules/bookings/expiry.job.ts:53-113` processes expired bookings in a loop with individual transactions.

**Files:** `apps/api/src/modules/bookings/expiry.job.ts:53-113`

**Current Code:**
```typescript
for (const booking of expiredBookings) {
  try {
    await prisma.$transaction(async (tx) => { ... })
  } catch (bookingErr) {
    app.log.error({ ... }, '[cron:expiry] Failed to expire booking')
  }
}
```

**Impact:** If 10,000 bookings expire simultaneously, loop processes one-by-one (serialized). Runs hourly, so 10k bookings = ~6-10 seconds processing time (acceptable).

**Assessment:** ACCEPTABLE — Cron job runs hourly; processing time is not user-facing. Batch size (10,000) is rare.

**Improvement Path:** Implement batch update with `updateMany` to process in single transaction:
```typescript
await prisma.booking.updateMany({
  where: { status: 'PENDING', expiresAt: { lte: new Date() } },
  data: { status: 'EXPIRED' },
})
```

---

## Dependencies at Risk

### No Active Security Patching Plan

**Issue:** Dependencies locked in `apps/api/package.json` without documented patch schedule.

**Files:** `apps/api/package.json` (all dependencies)

**Risk Packages:**
- `bcryptjs@3.0.3` — Consider `bcrypt` native bindings for production (faster)
- `mercadopago@2.12.0` — Maintenance unclear; verify if updates are released regularly
- `@fastify/helmet@13.0.2` — Helmet security headers; keep updated

**Assessment:** MEDIUM — No known CVEs in current versions (as of Feb 2025). Implement quarterly patch review.

**Recommendation:** Add `renovate` or `dependabot` GitHub action to track updates and alert on security patches.

---

## Missing Critical Features

### No Booking Confirmation Email Delivery Verification

**Issue:** System sends confirmation emails but has no way to track delivery or resend if customer doesn't receive it.

**Files:** `apps/api/src/modules/bookings/bookings.routes.ts:256-276`

**Problem:** Customer may not see PIX QR code if email is lost.

**Mitigation:** Self-service lookup endpoint (`/tenants/:slug/bookings/lookup`) allows customer to retrieve booking details and QR code manually. Acceptable for MVP.

---

### No Audit Log for Booking Modifications

**Issue:** Admin/guide booking cancellations and confirmations are not logged for audit purposes.

**Files:**
- `apps/api/src/modules/bookings/bookings.routes.ts:631-697` (cancel)
- `apps/api/src/modules/bookings/bookings.routes.ts:699-749` (confirm)

**Impact:** LGPD compliance concern — no record of who cancelled a booking and when.

**Fix Approach:** Add `AuditLog` table with `action`, `userId`, `bookingId`, `reason`, `timestamp`.

---

## Test Coverage Gaps

### Critical Path Not Covered

**What's Not Tested:**
- Multi-step booking flow (create → webhook confirm → delivery)
- Concurrent booking attempts on same slot (overbooking prevention)
- Slot conflict detection (guide double-booking)
- Webhook deduplication under concurrent delivery
- Payment failure compensation (slot release rollback)

**Files:** None of the above have corresponding test files.

**Risk:** MEDIUM — Bug in booking transaction could leak bookings without payment or release slots incorrectly.

**Priority:** HIGH — Add integration tests for booking flow before production launch.

---

### Email Failure Scenarios Not Tested

**What's Not Tested:**
- Resend API timeout/failure during booking creation
- Guide notification email failure (should not block booking)
- Expiry email failure (should not prevent booking expiration)

**Assessment:** Test email service mocking (Resend mock); verify fire-and-forget behavior doesn't break transaction.

---

## Deployment & Operations Concerns

### No Database Migration Rollback Plan

**Issue:** If production migration fails, no documented rollback procedure.

**Files:** `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/`

**Recommendation:**
1. Document rollback steps for each migration
2. Test rollback locally before production deploy
3. Keep old schema version in separate Git branch

---

### Advisory Lock Timeout Unexplained

**Issue:** Expiry cron uses `pg_try_advisory_lock` with implicit timeout (not specified in docs).

**Files:** `apps/api/src/modules/bookings/expiry.job.ts:13-19`

**Recommendation:** Document expected lock timeout in code comment; verify it matches cron interval (1 hour).

---

## Summary of Priorities

| Issue | Severity | Effort | Priority |
|-------|----------|--------|----------|
| WR-002: Full-table scan on booking lookup | HIGH | MEDIUM | 1 |
| Database query logging | MEDIUM | LOW | 2 |
| Missing test coverage for booking flow | HIGH | MEDIUM | 3 |
| LGPD audit log for booking changes | MEDIUM | MEDIUM | 4 |
| Pagination on booking/guide lists | MEDIUM | MEDIUM | 5 |
| Webhook error alerting | LOW | LOW | 6 |
| Public endpoint brute-force hardening | MEDIUM | LOW | 7 |

---

*Concerns audit: 2026-09-04*
