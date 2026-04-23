---
phase: 02-user-access-guide-onboarding
plan: "02"
subsystem: auth
tags: [fastify, zod, bcryptjs, prisma, registration, guide-profile, discriminated-union]

dependency_graph:
  requires:
    - phase: 02-01
      provides: GuideProfile model, ApprovalStatus enum, User.cpf field
  provides:
    - POST /tenants/:slug/auth/register endpoint (CLIENTE + CONDUTOR)
    - discriminatedUnion schema restricting role to CLIENTE | CONDUTOR
    - CONDUTOR registration creates GuideProfile in same transaction
    - 409 on duplicate email within same tenant
  affects: [02-03, 02-04, 02-05]

tech_stack:
  added: []
  patterns:
    - "z.discriminatedUnion('role', [...]) for role-discriminated body validation"
    - "prisma.$transaction for atomic User + GuideProfile creation"
    - "Prisma P2002 catch pattern for unique constraint → 409"
    - "hashSync(password, 10) before persist, never returned in response"

key_files:
  created: []
  modified:
    - apps/api/src/modules/auth/auth.routes.ts

key_decisions:
  - "approvalStatus not set explicitly in CLIENTE create — Prisma default (PENDING) applies; future plan may differentiate CLIENTE vs CONDUTOR defaults"
  - "cpf stored for CONDUTOR but never returned in register response — enforcement maintained"
  - "slugParamsSchema defined locally in auth.routes.ts (not shared) to keep module self-contained"

patterns-established:
  - "Registration discriminated on role field: CLIENTE path is simple create, CONDUTOR path is $transaction wrapping User + GuideProfile"
  - "All Zod validation errors use err.issues.map() (NOT err.errors) per project convention"

requirements-completed: [AUTH-01, AUTH-02]

duration: "2m 3s"
completed: "2026-04-23"
---

# Phase 2 Plan 02: User Registration Endpoint Summary

**POST /tenants/:slug/auth/register with role-discriminated Zod schema: CLIENTE creates User, CONDUTOR creates User + GuideProfile in $transaction, duplicate email returns 409, password never returned.**

## Performance

- **Duration:** 2m 3s
- **Started:** 2026-04-23T20:57:01Z
- **Completed:** 2026-04-23T20:59:04Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Register endpoint fully implemented with `z.discriminatedUnion('role')` preventing ADMIN/ATENDENTE self-registration (T-02-02-01, T-02-02-03)
- CONDUTOR registration atomically creates User + GuideProfile via `prisma.$transaction` — no orphaned users possible
- Password never appears in any response path — `select: { id: true }` on create, final `send` only returns `{ message }` (T-02-02-02)
- Duplicate email within same tenant returns 409 via Prisma P2002 catch
- Existing `/auth/login` route untouched

## Task Commits

1. **Task 1: Implement POST /tenants/:slug/auth/register** - `83a1efc` (feat)

**Plan metadata:** (pending — created after this summary)

## Files Created/Modified

- `apps/api/src/modules/auth/auth.routes.ts` - Added `registerBodySchema` (discriminatedUnion), `slugParamsSchema`, and `POST /tenants/:slug/auth/register` handler with CLIENTE/CONDUTOR branching, bcrypt hashing, $transaction for CONDUTOR, P2002 handling

## Decisions Made

- `approvalStatus` not passed explicitly on `prisma.user.create` — Prisma schema default `PENDING` applies for both roles. Future plan (02-03 or 02-05) can add logic to auto-APPROVE CLIENTE accounts if desired.
- CPF stored for CONDUTOR but never surfaced in register response per T-02-01-02 / T-02-02-02 threat mitigations.
- `slugParamsSchema` defined locally rather than importing from packages module — keeps auth module self-contained.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — endpoint creates real DB records with real hashed passwords. No placeholder data or mock responses.

## Threat Flags

No new threat surface introduced beyond what the plan's threat model already covers (T-02-02-01 through T-02-02-04 all mitigated).

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Registration endpoint ready for integration testing once Railway DB is live
- GuideProfile created atomically on CONDUTOR register — 02-03 (guide profile editing) can assume profile exists
- Auth foundation (login + register) complete — 02-04 (guide approval) can now reference User.approvalStatus

---
*Phase: 02-user-access-guide-onboarding*
*Completed: 2026-04-23*

## Self-Check: PASSED

- apps/api/src/modules/auth/auth.routes.ts: FOUND
- Commit 83a1efc: FOUND
