---
phase: 7
slug: platform-hardening
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-16
updated: 2026-05-22
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | `apps/api/vitest.config.ts` (if exists) or inline |
| **Quick run command** | `pnpm --filter @turismo/api test -- rate-limit` |
| **Full suite command** | `pnpm --filter @turismo/api test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @turismo/api test`
- **After every plan wave:** Run `pnpm --filter @turismo/api test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | OPS-02 | T-7-01 | 21st req/min to auth routes → 429 | integration | `pnpm --filter @turismo/api test -- rate-limit` | ✅ | ✅ green |
| 7-01-02 | 01 | 1 | OPS-02 | T-7-01 | Webhook `/webhooks/mercadopago` never returns 429 | integration | `pnpm --filter @turismo/api test -- rate-limit` | ✅ | ✅ green |
| 7-01-03 | 01 | 1 | OPS-02 | — | 429 response includes `Retry-After` header | integration | `pnpm --filter @turismo/api test -- rate-limit` | ✅ | ✅ green |
| 7-02-01 | 02 | 1 | OPS-03 | T-7-02 | Sentry.captureException called for non-AppError throws | unit | `pnpm --filter @turismo/api test -- sentry` | ✅ | ✅ green |
| 7-02-02 | 02 | 1 | OPS-03 | T-7-02 | AppError does NOT trigger Sentry.captureException | unit | `pnpm --filter @turismo/api test -- sentry` | ✅ | ✅ green |
| 7-02-03 | 02 | 1 | OPS-03 | — | Sentry.init reads DSN from env, not hardcoded | unit | `pnpm --filter @turismo/api test -- sentry` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `apps/api/src/__tests__/rate-limit.test.ts` — integration tests for OPS-02 (auth 429, webhook exempt, Retry-After header)
- [x] `apps/api/src/__tests__/sentry.test.ts` — unit tests for OPS-03 (captureException called/not called, DSN from env)

*All Wave 0 gaps resolved — 43/43 tests green (2026-05-22).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sentry alert arrives in dashboard after unhandled error | OPS-03 | Requires live Sentry account + SENTRY_DSN | Throw an unhandled error in dev/staging with DSN set; verify alert in Sentry dashboard |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** passed — 2026-05-22

---

## Validation Audit 2026-05-22

| Metric | Count |
|--------|-------|
| Gaps found | 6 |
| Resolved | 6 |
| Escalated to manual-only | 0 |
| Test files verified | 2 (`rate-limit.test.ts`, `sentry.test.ts`) |
| Total tests green | 43/43 |

Both Wave 0 test files were written during phase execution (07-01 and 07-02). All 6 per-task behaviors are covered by automated tests. No new tests generated — existing suite is complete.
