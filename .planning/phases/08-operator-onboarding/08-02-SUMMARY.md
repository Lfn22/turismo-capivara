---
phase: 08-operator-onboarding
plan: 02
subsystem: api-tenants
tags: [operator-signup, approval, resend, email, super-admin, rate-limit]
dependency_graph:
  requires: [08-01]
  provides: [POST /tenants/signup, GET /tenants/check-slug, GET /tenants/admin/pending, PATCH /tenants/:id/approve, PATCH /tenants/:id/reject]
  affects: [tenants.routes.ts, signup.test.ts, approval.test.ts]
tech_stack:
  added: [resend]
  patterns: [prisma.$transaction atomic create, getResend() graceful-fallback, zodError400 helper, route-level rateLimit]
key_files:
  created:
    - apps/api/src/modules/tenants/emails/approval-email.ts
    - apps/api/src/modules/tenants/emails/rejection-email.ts
  modified:
    - apps/api/src/modules/tenants/tenants.routes.ts
    - apps/api/src/modules/tenants/__tests__/signup.test.ts
    - apps/api/src/modules/tenants/__tests__/approval.test.ts
decisions:
  - resend installed as @turismo/api dependency; email delivery wrapped in getResend() null-check so missing RESEND_API_KEY logs warning without breaking approve/reject flow
  - Tests mock prisma.$transaction and resend directly; no real HTTP or DB connections in test suite
  - tenantIdParamsSchema defined at module scope (reused by approve and reject routes)
metrics:
  duration: ~25 minutes
  completed: 2026-05-18
  tasks_completed: 2
  files_changed: 5
---

# Phase 8 Plan 02: Operator Signup and SUPER_ADMIN Approval API Summary

## Objective Achieved

All 5 operator lifecycle endpoints implemented and wired into tenantsRoutes. Signup creates Tenant + ADMIN user atomically via prisma.$transaction. Approval/rejection protected by SUPER_ADMIN role; email sent via Resend with graceful degradation when RESEND_API_KEY is absent. All test stubs replaced with passing inject-based tests (29 tests total, 0 failures).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install resend + email templates | 0dd066e | approval-email.ts, rejection-email.ts, package.json |
| 2 | API endpoints + tests to GREEN | 025bc58 | tenants.routes.ts, signup.test.ts, approval.test.ts |

## Files Created

- `apps/api/src/modules/tenants/emails/approval-email.ts` — approvalEmailText() PT-BR plain-text template
- `apps/api/src/modules/tenants/emails/rejection-email.ts` — rejectionEmailText() PT-BR plain-text template

## Files Modified

- `apps/api/src/modules/tenants/tenants.routes.ts` — 5 new endpoints added (signup, check-slug, admin/pending, approve, reject)
- `apps/api/src/modules/tenants/__tests__/signup.test.ts` — 3 todo stubs replaced with passing tests
- `apps/api/src/modules/tenants/__tests__/approval.test.ts` — 3 todo stubs replaced with passing tests

## Endpoints Implemented

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /tenants/signup | none (rate-limited 5/hr) | Create Tenant + ADMIN user atomically |
| GET | /tenants/check-slug | none | Returns { available: true/false } |
| GET | /tenants/admin/pending | SUPER_ADMIN | List PENDING tenants with ADMIN email |
| PATCH | /tenants/:id/approve | SUPER_ADMIN | Set APPROVED + send approval email |
| PATCH | /tenants/:id/reject | SUPER_ADMIN | Set REJECTED with reason + send rejection email |

## Commits

- `0dd066e` — feat(08-02): install resend and create approval/rejection email templates
- `025bc58` — feat(08-02): implement operator lifecycle endpoints + update tests to green

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All plan-02 stubs resolved; email templates are production-ready PT-BR plain-text.

## Threat Flags

All threat mitigations from plan's threat model applied:
- T-8-04: POST /tenants/signup rate-limited (max: 5, timeWindow: '1 hour')
- T-8-05: PATCH approve/reject protected by `preHandler: [authenticate, authorize(['SUPER_ADMIN'])]`
- T-8-06: P2002 returns 409 "Slug já em uso" — binary available/taken, no enumeration
- T-8-07: GET /tenants/admin/pending returns only PENDING tenants with ADMIN email; no passwords

## Self-Check: PASSED

- [x] `apps/api/src/modules/tenants/emails/approval-email.ts` exists
- [x] `apps/api/src/modules/tenants/emails/rejection-email.ts` exists
- [x] `apps/api/src/modules/tenants/tenants.routes.ts` — 5 new routes present
- [x] `apps/api/src/modules/tenants/__tests__/signup.test.ts` — 3 real tests
- [x] `apps/api/src/modules/tenants/__tests__/approval.test.ts` — 3 real tests
- [x] Commits 0dd066e, 025bc58 exist in git log
- [x] `pnpm tsc --noEmit` exits 0
- [x] `pnpm test --run` — 29 passed, 0 todo, 0 failures
