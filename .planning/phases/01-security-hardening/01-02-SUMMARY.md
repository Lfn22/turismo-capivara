---
phase: 01-security-hardening
plan: "02"
subsystem: api-auth
tags: [security, auth, middleware, cross-tenant, bookings]
dependency_graph:
  requires: [01-01]
  provides: [cross-tenant-auth, booking-endpoint-protection]
  affects: [apps/api/src/shared/middlewares/authenticate.ts, apps/api/src/modules/bookings/bookings.routes.ts]
tech_stack:
  added: []
  patterns: [preHandler, AppError-throw, cross-tenant-ownership-check]
key_files:
  created: []
  modified:
    - apps/api/src/shared/middlewares/authenticate.ts
    - apps/api/src/modules/bookings/bookings.routes.ts
decisions:
  - Use AppError throws (not inline reply.status) in authenticate.ts to leverage the global error handler from 01-01
  - Skip cross-tenant check for routes without :slug param — guard is conditionally applied
  - Double tenant lookup (middleware + route handler) accepted as pragmatic for this phase
metrics:
  duration: "~10 minutes"
  completed: "2026-04-20"
  tasks_completed: 2
  files_modified: 2
---

# Phase 1 Plan 02: Cross-Tenant Auth Middleware + Booking Endpoint Protection Summary

**One-liner:** JWT cross-tenant ownership check in authenticate.ts + preHandler protection on PATCH cancel/confirm booking routes.

## What Was Built

**Task 1 — authenticate.ts cross-tenant ownership check (commit ee5ed7f)**

Extended `apps/api/src/shared/middlewares/authenticate.ts` from 11 lines to 31 lines:
- `request.jwtVerify()` remains the first step — returns 401 on invalid/missing JWT
- After JWT verification, extracts `:slug` from `request.params` (cast to partial record)
- If slug is present: resolves the tenant via `prisma.tenant.findUnique({ where: { slug } })`
- Throws `AppError('Tenant não encontrado', 404)` if tenant not found
- Throws `AppError('Acesso negado a este tenant', 403)` if `JWT.tenantId !== tenant.id`
- Routes without `:slug` param (e.g., POST /auth/login) are completely unaffected

**Task 2 — preHandler on PATCH cancel and PATCH confirm (commit 6fe6374)**

Modified `apps/api/src/modules/bookings/bookings.routes.ts`:
- `PATCH /tenants/:slug/bookings/:id/cancel` — added `{ preHandler: [authenticate] }` option
- `PATCH /tenants/:slug/bookings/:id/confirm` — added `{ preHandler: [authenticate] }` option
- Both routes converted from 2-arg to 3-arg `app.patch(url, opts, handler)` form
- GET /tenants/:slug/bookings (already had onRequest) and POST unchanged

## Verification Results

```
grep -n "AppError" authenticate.ts        → 3 lines: import + 2 throws
grep -n "reply.status(403|404)" authenticate.ts → (none — correct)
grep -c "preHandler.*authenticate" bookings.routes.ts → 2
npx tsc --noEmit → clean (no output)
```

## Decisions Made

1. **AppError throws over inline reply.status** — authenticate.ts uses `throw new AppError(...)` for 404 and 403 cases, relying on the global error handler registered in plan 01-01. This is consistent with D-05 and avoids mixing inline reply patterns with the global handler.

2. **Conditional slug check** — the cross-tenant check is skipped when `slug` is undefined, making the middleware safe to use on any route regardless of whether it has a `:slug` param.

3. **Double tenant lookup accepted** — the middleware resolves the tenant from slug for the ownership check; the route handler also resolves it for business logic. This redundancy is pragmatic for Phase 1 and may be optimized in a later phase by attaching the resolved tenant to `request` state.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Coverage

| Threat ID | Category | Status |
|-----------|----------|--------|
| T-02-01 | Spoofing — unauthenticated PATCH cancel/confirm | Mitigated: preHandler returns 401 |
| T-02-02 | Elevation of Privilege — cross-tenant booking access | Mitigated: AppError(403) when JWT.tenantId != tenant.id |
| T-02-03 | Information Disclosure — tenant lookup in middleware | Accepted: only 404/403, no internal IDs leaked |

## Known Stubs

None.

## Threat Flags

None — no new network surface introduced beyond what the plan specified.

## Self-Check: PASSED

- `apps/api/src/shared/middlewares/authenticate.ts` — exists and contains cross-tenant check
- `apps/api/src/modules/bookings/bookings.routes.ts` — exists with preHandler on both PATCH routes
- Commit ee5ed7f — exists (feat(01-02): extend authenticate.ts)
- Commit 6fe6374 — exists (feat(01-02): add authenticate preHandler)
