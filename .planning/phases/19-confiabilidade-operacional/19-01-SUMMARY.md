---
phase: 19-confiabilidade-operacional
plan: "01"
subsystem: api-backend
tags: [reliability, cron, uploads, sentry, email]
dependency_graph:
  requires: []
  provides:
    - hourly-expiry-cron
    - r2-503-response
    - sentry-email-capture
  affects:
    - booking-expiry-job
    - uploads-route
    - tenant-approval-routes
tech_stack:
  added: []
  patterns:
    - R2 config error detection via regex on error message
    - Sentry.captureException in email catch blocks (fire-and-forget pattern)
key_files:
  created: []
  modified:
    - apps/api/src/modules/bookings/expiry.job.test.ts
    - apps/api/src/modules/uploads/uploads.routes.ts
    - apps/api/src/modules/uploads/uploads.routes.test.ts
    - apps/api/src/modules/tenants/tenants.routes.ts
    - apps/api/src/modules/tenants/__tests__/approval.test.ts
decisions:
  - "cronTime fix already applied in 21-04; this plan adds the missing schedule assertion test"
  - "R2 detection uses /R2|CLOUDFLARE/i regex on error message — matches all config error variants"
  - "Sentry mock uses vi.mock('../../../shared/sentry') for deterministic captureException assertion"
  - "shared/email mock (getResend) controls email path in Sentry tests — avoids Resend constructor complexity"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-27T00:06:09Z"
  tasks_completed: 3
  files_changed: 5
---

# Phase 19 Plan 01: Must-Haves — Cron Fix, R2 503, Sentry Email Capture Summary

Three surgical reliability fixes: verified hourly cron schedule, descriptive 503 for missing R2 config, and Sentry error capture for tenant email failures.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Verify cron fix + add schedule test | e4958a2 | expiry.job.test.ts |
| 2 | 503 response for R2 misconfiguration | adb4fce | uploads.routes.ts, uploads.routes.test.ts |
| 3 | Sentry.captureException in approve/reject email catch | 1945e74 | tenants.routes.ts, approval.test.ts |

## Decisions Made

1. **Task 1 was pre-satisfied** — the cron fix (`'0 * * * *'`) was applied in phase 21-04. This plan added the missing test assertion that explicitly verifies the `cronTime` value.

2. **R2 detection by regex** — `/R2|CLOUDFLARE/i.test(err.message)` catches all variants from `getR2Client()`, `getR2Bucket()`, and `getR2PublicUrl()` without coupling to specific error types.

3. **Sentry mock strategy** — mocking `shared/sentry` directly ensures `captureException` is a `vi.fn()` that can be asserted. Mocking `shared/email` (instead of `resend` class) lets tests control `getResend()` return value cleanly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Mock strategy for Sentry tests**
- **Found during:** Task 3
- **Issue:** Plan's suggested approach (`vi.mocked(Resend).mockImplementationOnce`) wouldn't work because `getResend()` returns `null` when `RESEND_API_KEY` is absent in test env — the `if (resend && ...)` guard silently skips the email block entirely.
- **Fix:** Added `vi.mock('../../../shared/email', ...)` to control `getResend()` return value, ensuring the email path executes and the catch block fires.
- **Files modified:** `approval.test.ts`
- **Commit:** 1945e74

## Pre-existing Test Failures (Out of Scope)

Four pre-existing failures in `uploads.routes.test.ts` use `.error` field but route returns `.message` — field name mismatch predates this plan. Not fixed (out of scope per deviation rules). Logged here for future cleanup.

Six pre-existing failures in `bookings-create.test.ts` and `self-service.test.ts` — unrelated to this plan's changes.

Two pre-existing failures in `expiry.job.test.ts` (NOTIF-04 email tests) — mock doesn't simulate the `catch` chain correctly; predates this plan.

## Known Stubs

None.

## Threat Flags

None — no new endpoints or trust boundaries introduced.

## Self-Check: PASSED

- [x] `apps/api/src/modules/bookings/expiry.job.test.ts` — exists, cronTime test at line 39
- [x] `apps/api/src/modules/uploads/uploads.routes.ts` — 503 at catch block
- [x] `apps/api/src/modules/uploads/uploads.routes.test.ts` — 3 new R2 tests
- [x] `apps/api/src/modules/tenants/tenants.routes.ts` — 2x captureException
- [x] `apps/api/src/modules/tenants/__tests__/approval.test.ts` — 2 Sentry tests passing
- [x] Commits e4958a2, adb4fce, 1945e74 confirmed in git log
- [x] `grep "cronTime" expiry.job.ts` → `cronTime: '0 * * * *'`
- [x] `grep -c "captureException" tenants.routes.ts` → `2`
- [x] `grep "503" uploads.routes.ts` → `reply.status(503)`
