---
phase: 01-security-hardening
plan: 03
subsystem: api-validation
tags: [zod, validation, security, input-validation, error-handling]
dependency_graph:
  requires: [01-02]
  provides: [SEC-01]
  affects: [apps/api/src/modules/auth/auth.routes.ts, apps/api/src/modules/bookings/bookings.routes.ts, apps/api/src/modules/packages/packages.routes.ts, apps/api/src/modules/tenants/tenants.routes.ts]
tech_stack:
  added: [zod@4.3.6]
  patterns: [ZodError.issues mapping to D-04 format, AppError for non-validation HTTP errors, inline schema.parse() in route handlers]
key_files:
  modified:
    - apps/api/src/modules/auth/auth.routes.ts
    - apps/api/src/modules/tenants/tenants.routes.ts
    - apps/api/src/modules/packages/packages.routes.ts
    - apps/api/src/modules/bookings/bookings.routes.ts
    - apps/api/package.json
    - pnpm-lock.yaml
decisions:
  - "Used ZodError.issues (not .errors) because Zod v4 renamed the field — .errors does not exist in v4"
  - "parseParams() helper in packages.routes.ts avoids duplicating ZodError catch block across two GET routes"
  - "zodError400() helper in bookings.routes.ts centralizes D-04 error format for the 5 Zod catch points"
metrics:
  duration: "3m 50s"
  completed_date: "2026-04-20"
  tasks_completed: 2
  files_modified: 6
---

# Phase 1 Plan 03: Zod Validation Across All Four Route Modules Summary

Zod v4 installed and inline validation schemas added to all four API route files; all TypeScript body/param casts replaced with schema.parse(); ZodError mapped to D-04 Portuguese error format; non-validation errors converted to AppError throws.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install Zod + validate auth.routes.ts + tenants.routes.ts | 61a8c08 | auth.routes.ts, tenants.routes.ts, package.json, pnpm-lock.yaml |
| 2 | Add Zod validation to packages.routes.ts + bookings.routes.ts | a98141a | packages.routes.ts, bookings.routes.ts |

## What Was Built

- **Zod v4.3.6** installed as a dependency in `apps/api`
- **auth.routes.ts:** `loginBodySchema` validates email format, password non-empty, tenantSlug non-empty; ZodError returns 400 with `{ message: 'Dados inválidos', errors: [{field, message}] }`; three `reply.status(401)` inline sends replaced with `throw new AppError('Credenciais inválidas', 401)`
- **tenants.routes.ts:** `slugParamsSchema` validates `:slug` param is non-empty string; `reply.status(404)` replaced with `throw new AppError('Tenant não encontrado', 404)`
- **packages.routes.ts:** `slugParamsSchema` and `slugAndIdParamsSchema` for both GET routes; `parseParams()` helper centralizes ZodError catch; all inline `reply.status(404)` replaced with AppError throws
- **bookings.routes.ts:** `createBookingBodySchema` validates all 5 booking fields including `pax` as `z.number().int().positive()`; `slugParamsSchema` and `slugAndIdParamsSchema` for params; `zodError400()` helper centralizes D-04 mapping; all 4 route handlers validate params; `preHandler: [authenticate]` preserved on cancel and confirm routes; internal transaction errors now throw AppError instead of string-keyed Error codes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 uses `.issues` not `.errors` on ZodError**
- **Found during:** Task 1, pre-implementation verification
- **Issue:** The plan was authored for Zod v3 which has `ZodError.errors`. Zod v4 (installed: 4.3.6) renamed this to `ZodError.issues`. Using `.errors` would return `undefined` and send `{ message: 'Dados inválidos', errors: undefined }` — a broken response.
- **Fix:** All ZodError catch blocks use `err.issues.map(...)` instead of `err.errors.map(...)`
- **Files modified:** all 4 route files
- **Commits:** 61a8c08, a98141a

## Known Stubs

None. All validation schemas are fully wired to route handlers.

## Threat Flags

None. All threat mitigations from the plan's STRIDE register (T-03-01 through T-03-05) are implemented.

## Self-Check: PASSED

- `apps/api/src/modules/auth/auth.routes.ts` — exists, contains loginBodySchema, ZodError catch, AppError throws
- `apps/api/src/modules/tenants/tenants.routes.ts` — exists, contains slugParamsSchema, AppError(404)
- `apps/api/src/modules/packages/packages.routes.ts` — exists, contains 2 z.object schemas, parseParams helper
- `apps/api/src/modules/bookings/bookings.routes.ts` — exists, contains 3 z.object schemas, zodError400 helper, 2 preHandler: [authenticate]
- `apps/api/package.json` — contains `"zod": "^4.3.6"`
- TypeScript: `npx tsc --noEmit` exits 0
- Commits 61a8c08 and a98141a present in git log
- No `request.body as` or `request.params as` in any of the 4 route files
