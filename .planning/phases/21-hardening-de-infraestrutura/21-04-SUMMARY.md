# Plan 21-04 Summary

**Status:** Complete
**Goal:** Cron schedule fix + checkout test portability

## Tasks Completed

- **Task 1 — Fix cron schedule (INFRA-07):** Changed `cronTime` in `expiry.job.ts` from `'* * * * *'` (every minute) to `'0 * * * *'` (every hour). Single-character change, verified by reading the file.

- **Task 2 — Port checkout.test.ts (INFRA-08):** Copied `checkout.test.ts` from worktree `.worktrees/capi-mvp-melhorias/apps/api/src/__tests__/` to main codebase `apps/api/src/__tests__/`. Adjusted three items relative to the worktree original:
  1. Added `process.env.CPF_SECRET = 'test-cpf-secret-for-tests'` before module imports (required by `hashCpf`)
  2. Changed `customerCpf` from `'12345678901'` to `'52998224725'` — main codebase added full CPF checksum validation (`isValidCPF`) that the worktree's route did not have; the original fixture failed the checksum
  3. Added `approvalStatus: 'APPROVED'` to the `TENANT` fixture — main codebase has a tenant approval gate (line 106 of bookings.routes.ts) that returns 403 for non-APPROVED tenants

## Commits Made

- `7c62b84` — `fix(21-04): correct cron schedule from every minute to every hour`
- `6a9832c` — `feat(21-04): port checkout.test.ts from worktree to main codebase`

## Must-Have Verification

- [x] `cronTime` in `expiry.job.ts` is `'0 * * * *'` (every hour, not every minute)
- [x] `checkout.test.ts` exists at `apps/api/src/__tests__/checkout.test.ts`
- [x] All 4 checkout tests pass (`pnpm --filter api test` — checkout.test.ts shows 4/4 passing; 12 remaining failures are pre-existing in other test files)

## Issues Encountered

Two import-path adjustments were required when porting the test from the worktree:

1. **CPF validation mismatch:** The worktree's `bookings.routes.ts` only validated CPF format with a regex (`/^\d{11}$/`). The main codebase added a full checksum validator (`isValidCPF`). The test fixture CPF `12345678901` fails the checksum, so it was replaced with `52998224725` (a valid CPF by algorithm).

2. **Tenant approval gate:** The main codebase added a check that throws 403 if `tenant.approvalStatus !== 'APPROVED'`. The worktree did not have this gate. The mock fixture was missing the field, causing the route to return 403 before reaching the transaction mock. Fixed by adding `approvalStatus: 'APPROVED'` to the TENANT fixture.

These are classified as Rule 1 (auto-fix bugs) deviations — the test would have been non-functional without these fixes.
