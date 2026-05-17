---
phase: 07-platform-hardening
plan: 02
subsystem: api-error-monitoring
tags: [sentry, error-monitoring, fastify, tdd]
dependency_graph:
  requires: [07-01]
  provides: [sentry-integration]
  affects: [apps/api/src/app.ts]
tech_stack:
  added: ["@sentry/node@8.55.2"]
  patterns: ["Sentry.withScope for contextual error capture", "no-op guard on missing DSN"]
key_files:
  created:
    - apps/api/src/shared/sentry.ts
    - apps/api/src/__tests__/sentry.test.ts
  modified:
    - apps/api/src/app.ts
    - apps/api/.env.example
    - apps/api/package.json
decisions:
  - "AppError instances filtered before captureException — business errors never reach Sentry (D-07)"
  - "initSentry() called before Fastify() at module scope — ensures SDK initialized before app creation (D-08)"
  - "tracesSampleRate: 0.1 in production, 1.0 in dev/test"
  - "AppError constructor signature is (message, statusCode) — corrected from plan which showed (statusCode, message)"
metrics:
  duration: "~4 minutes"
  completed: "2026-05-17"
  tasks_completed: 2
  files_changed: 5
---

# Phase 7 Plan 02: Sentry Error Monitoring Summary

**One-liner:** Sentry integrated into Fastify error lifecycle — only non-AppError exceptions captured with tenant_slug, user_id, and route context; graceful no-op when DSN absent.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install package + write failing tests (RED) | e46801e | sentry.test.ts, package.json, pnpm-lock.yaml |
| 2 | Create sentry.ts + integrate app.ts (GREEN) | 8b0de46 | sentry.ts, app.ts, .env.example |

## What Was Built

**`apps/api/src/shared/sentry.ts`** — Initialization module:
- `initSentry()`: reads `SENTRY_DSN` from env; no-ops silently if absent
- `tracesSampleRate`: 0.1 in production, 1.0 otherwise
- Exports `{ initSentry, Sentry }` for app.ts consumption

**`apps/api/src/app.ts`** — Integration points:
- `initSentry()` called at module scope before `Fastify()` creation
- `Sentry.setupFastifyErrorHandler(app)` registered immediately after `Fastify()`, before plugins
- `setErrorHandler` updated: AppError branch returns without touching Sentry; non-AppError captured via `Sentry.withScope` with `tenant_slug`, `user_id`, `route` context tags

**`apps/api/src/__tests__/sentry.test.ts`** — 4 unit tests (all passing):
1. `captureException` called for non-AppError
2. `captureException` NOT called for AppError
3. `initSentry()` does not throw when `SENTRY_DSN` absent
4. `Sentry.withScope` sets `tenant_slug` tag when slug param present

## Plugin Registration Order (final)

1. `initSentry()` — before Fastify()
2. `Fastify({ trustProxy: true })`
3. `Sentry.setupFastifyErrorHandler(app)` — before custom handler
4. rawBody, cors, helmet, rate-limit, jwt
5. routes
6. custom `setErrorHandler` — AppError silent, non-AppError → Sentry

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AppError constructor signature corrected**
- **Found during:** Task 1 (writing tests)
- **Issue:** Plan showed `new AppError(404, 'SLOT_NOT_FOUND')` but actual `AppError.ts` has `constructor(message: string, statusCode = 400)` — arguments reversed
- **Fix:** Tests use `new AppError('SLOT_NOT_FOUND', 404)` matching actual signature
- **Files modified:** apps/api/src/__tests__/sentry.test.ts

None other — plan executed as written.

## Threat Model Coverage

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-7-02 | AppError filter before captureException | Implemented — `if (err instanceof AppError) return` before any Sentry call |
| T-7-02b | DSN from env only, no hardcode | Implemented — `initSentry()` reads `process.env.SENTRY_DSN`; no `sentry.io` string in source |

## Self-Check: PASSED

- [x] `apps/api/src/shared/sentry.ts` exists
- [x] `apps/api/src/__tests__/sentry.test.ts` exists with 4 tests
- [x] Commit e46801e exists (RED)
- [x] Commit 8b0de46 exists (GREEN)
- [x] `pnpm --filter @turismo/api test` — 20/20 passed
- [x] No hardcoded DSN in source (`grep -r "sentry.io" apps/api/src/` returns empty)
- [x] `initSentry()` at line 5, `const app = Fastify` at line 23 — correct order
- [x] `apps/api/.env.example` contains `SENTRY_DSN=`

## TDD Gate Compliance

- RED gate: commit `e46801e` — `test(07-02): add failing Sentry unit tests (RED)`
- GREEN gate: commit `8b0de46` — `feat(07-02): integrate Sentry error monitoring into API`
- REFACTOR: not needed
