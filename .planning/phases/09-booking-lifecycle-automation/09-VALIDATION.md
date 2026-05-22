---
phase: 09
slug: booking-lifecycle-automation
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-22
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `apps/api/vitest.config.ts` |
| **Quick run command** | `cd apps/api && pnpm vitest run src/modules/bookings` |
| **Full suite command** | `cd apps/api && pnpm vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && pnpm vitest run src/modules/bookings`
- **After every plan wave:** Run `cd apps/api && pnpm vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01 | 09-01 | 1 | OPS-01 | — | PENDING bookings expire, slot capacity decremented, advisory lock prevents race | unit (mocked) | `cd apps/api && pnpm vitest run src/modules/bookings/expiry.job.test.ts` | ✅ | ✅ green |
| 09-02 | 09-02 | 1 | NOTIF-01 | — | Turista recebe email criação com PIX | unit | `cd apps/api && pnpm vitest run src/modules/bookings/emails/booking-created-email.test.ts` | ✅ | ✅ green |
| 09-03 | 09-03 | 1 | NOTIF-02 | — | Turista recebe email confirmação pagamento aprovado | unit | `cd apps/api && pnpm vitest run src/modules/bookings/emails/booking-confirmed-email.test.ts` | ✅ | ✅ green |
| 09-04 | 09-04 | 1 | NOTIF-03 | — | Condutor recebe email aprovação de conta de guia | unit | `cd apps/api && pnpm vitest run src/modules/bookings/emails/guide-approved-email.test.ts` | ✅ | ✅ green |
| 09-05 | 09-05 | 1 | NOTIF-04 | — | Turista recebe email quando booking expira automaticamente | unit | `cd apps/api && pnpm vitest run src/modules/bookings/emails/booking-expired-email.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-22

---

## Validation Audit 2026-05-22

| Metric | Count |
|--------|-------|
| Gaps found | 5 |
| Resolved | 5 |
| Escalated | 0 |

All 5 requirements (OPS-01, NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04) covered by unit tests. 20/20 tests green.
