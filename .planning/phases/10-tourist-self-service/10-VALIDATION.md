---
phase: 10
slug: tourist-self-service
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-21
signed_off: 2026-05-22
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest v4.1.5 |
| **Config file** | `apps/api/vitest.config.ts` (or package.json scripts) |
| **Quick run command** | `cd apps/api && pnpm test` |
| **Full suite command** | `cd apps/api && pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && pnpm test`
- **After every plan wave:** Run `cd apps/api && pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | TOURIST-01 | T-10-01 | Lookup with valid email+code returns booking | unit/integration | `cd apps/api && pnpm test` | ✅ self-service.test.ts | ✅ green |
| 10-01-02 | 01 | 1 | TOURIST-01 | T-10-02 | Lookup with wrong email returns opaque 404 (no info leak) | unit | `cd apps/api && pnpm test` | ✅ self-service.test.ts | ✅ green |
| 10-01-03 | 01 | 1 | TOURIST-01 | T-10-02 | Lookup with wrong code returns opaque 404 (no info leak) | unit | `cd apps/api && pnpm test` | ✅ self-service.test.ts | ✅ green |
| 10-01-04 | 01 | 1 | TOURIST-01 | T-10-03 | Rate limit 5/15min per email triggers 429 | integration | `cd apps/api && pnpm test` | ✅ rate-limit.test.ts | ✅ green |
| 10-02-01 | 02 | 1 | TOURIST-02 | T-10-04 | cancel-self rejects if > cutoff (within 24h of departure) | unit | `cd apps/api && pnpm test` | ✅ self-service.test.ts | ✅ green |
| 10-02-02 | 02 | 1 | TOURIST-02 | — | cancel-self succeeds for PENDING booking, updates slot | unit | `cd apps/api && pnpm test` | ✅ self-service.test.ts | ✅ green |
| 10-02-03 | 02 | 1 | TOURIST-02 | — | repay returns new qrCode for EXPIRED booking | unit | `cd apps/api && pnpm test` | ✅ self-service.test.ts | ✅ green |
| 10-02-04 | 02 | 1 | TOURIST-02 | — | qrCode persisted in POST /bookings | unit | `cd apps/api && pnpm test` | ✅ bookings-b1.test.ts | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `apps/api/src/__tests__/self-service.test.ts` — 11 tests covering TOURIST-01 lookup (4 cases), TOURIST-02 cancel-self (3 cases), repay (3 cases)
- [x] Rate-limit test coverage for per-email `keyGenerator` — 4 new tests in `apps/api/src/__tests__/rate-limit.test.ts` (3 per-endpoint 429 + Retry-After header)
- [x] `apps/api/src/__tests__/bookings-b1.test.ts` — Wave 0 assertion that `qrCode` is persisted on POST /bookings (line 208)

*Existing infrastructure (`buildApp` helper, Vitest setup, vi.mock for Prisma) covers all phase test patterns.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| QR code PIX renders correctly in browser | TOURIST-01 | Image rendering and MP qrCode format requires visual inspection | Open `/[slug]/minha-reserva`, enter valid PENDING booking, verify QR code displays and is scannable |
| Cancellation email delivered | TOURIST-02 | Email delivery requires live Resend + real email address | Trigger cancel-self on a test booking, check inbox for cancellation email |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-05-22

---

## Validation Audit 2026-05-22

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

**Gap resolved:** 10-01-04 — per-email keyGenerator 429 test added to `rate-limit.test.ts` (4 new tests). All Wave 0 files existed on disk; VALIDATION.md was stale documentation debt from phase execution.

**Suite result:** 67/67 tests passing (63 pre-existing + 4 new), 13 test files, 2.59s.

## Validation Audit 2026-05-26

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

**Gap resolved:** `signup.test.ts` — 2 tests failing with 400 after commit `12eff0a` added required `cnpj` field to `signupBodySchema`. Added `cnpj: '12.345.678/0001-99'` to valid payloads in "returns 201" and "returns 409" tests.

**Suite result:** 67/67 tests passing, 13 test files, 4.07s.
