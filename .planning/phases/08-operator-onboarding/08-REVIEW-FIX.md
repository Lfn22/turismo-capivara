---
phase: 08-operator-onboarding
fixed_at: 2026-05-19T20:45:00-03:00
review_path: .planning/phases/08-operator-onboarding/08-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 08: Code Review Fix Report

**Fixed at:** 2026-05-19T20:45:00-03:00
**Source review:** .planning/phases/08-operator-onboarding/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Seed `hashCpf` falls back to hardcoded secret when `CPF_SECRET` is unset

**Files modified:** `apps/api/prisma/seed.ts`
**Commit:** 49fc0fa
**Applied fix:** Removed `?? 'dev-seed-secret'` fallback; now throws `Error('CPF_SECRET environment variable is required')` when variable is absent — matching production `hash.ts` behaviour.

### WR-02: `GET /tenants` returns full rows including sensitive fields to any ADMIN

**Files modified:** `apps/api/src/modules/tenants/tenants.routes.ts`
**Commit:** 395ab40
**Applied fix:** Added `request` parameter, extracted `user.tenantId`, scoped `findMany` with `where: { id: user.tenantId }` and `select: { id, name, slug }` — prevents cross-tenant enumeration of `approvalStatus`/`rejectionReason`.

### WR-03: Middleware `/painel` guard ordering is fragile

**Files modified:** `apps/web/middleware.ts`
**Commit:** fcf1596
**Applied fix:** Added `!pathname.startsWith('/super-admin')` condition to the `/painel` guard so SUPER_ADMIN users on future `/super-admin/.../painel/...` paths are not incorrectly redirected.

### WR-04: `approval.test.ts` does not test the idempotency guard (409)

**Files modified:** `apps/api/src/modules/tenants/__tests__/approval.test.ts`
**Commit:** 4a3859d
**Applied fix:** Added two test cases — one for approve on already-APPROVED tenant (expects 409) and one for reject on already-REJECTED tenant (expects 409) — covering the `if (tenant.approvalStatus !== 'PENDING')` guard in both endpoints.

---

_Fixed: 2026-05-19T20:45:00-03:00_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
