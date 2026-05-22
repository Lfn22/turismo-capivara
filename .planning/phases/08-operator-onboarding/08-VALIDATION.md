---
phase: 08-operator-onboarding
status: complete
nyquist_compliant: true
wave_0_complete: true
updated: 2026-05-22
---

# Phase 8 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `apps/api/vitest.config.ts` |
| **Quick run command** | `pnpm --filter @turismo/api test --run` |
| **Full suite command** | `pnpm --filter @turismo/api test --run && pnpm --filter @turismo/web build` |
| **Estimated runtime** | ~30 seconds |

## Sampling Rate

All 6 tasks have automated verify commands. No 3 consecutive tasks without automated coverage.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | ONBOARD-01 | — | Tenant+User criados atomicamente; falha parcial reverte | unit | `pnpm --filter @turismo/api test --run` | ✅ | ✅ green |
| 8-01-02 | 01 | 1 | ONBOARD-01 | — | Slug duplicado retorna 409 | unit | `pnpm --filter @turismo/api test --run` | ✅ | ✅ green |
| 8-02-01 | 02 | 2 | ONBOARD-02 | — | SUPER_ADMIN pode aprovar operadora | unit | `pnpm --filter @turismo/api test --run` | ✅ | ✅ green |
| 8-02-02 | 02 | 2 | ONBOARD-02 | — | Operadora rejeitada não aparece em listagens públicas | unit | `pnpm --filter @turismo/api test --run` | ✅ | ✅ green |
| 8-03-01 | 03 | 3 | SEC-05 | T-8-01 | CPF hasheado — nenhum plaintext na tabela Booking | unit | `pnpm --filter @turismo/api test --run` | ✅ | ✅ green |
| 8-04-01 | 04 | 3 | ONBOARD-03 | — | /onboarding page renderiza sem erro | e2e | `pnpm --filter @turismo/web build` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Requirements

- [x] `apps/api/src/modules/tenants/__tests__/signup.test.ts` — ONBOARD-01 (signup atômico, slug duplicado)
- [x] `apps/api/src/modules/tenants/__tests__/approval.test.ts` — ONBOARD-02 (approve/reject)
- [x] `apps/api/src/modules/bookings/__tests__/cpf-hash.test.ts` — SEC-05 (CPF hash + lookup)

*All 3 Wave 0 files exist and pass. No new framework install needed.*

## Manual-Only Verifications

| ID | Description | Reason |
|----|-------------|--------|
| M-01 | Resend approval/rejection email entregue ao destinatário | Requer conta Resend live + domínio verificado; não simulável em unit test |
| M-02 | Fluxo completo /onboarding → /aguardando → aprovação via /super-admin/operadoras no browser | Validação end-to-end de UX; não coberta por build check |

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-05-22 — retroactive sign-off after confirming 63/63 tests green

## Validation Audit 2026-05-22

| Metric | Count |
|--------|-------|
| Gaps found | 6 (all tasks were ⬜ pending in draft) |
| Resolved | 6 (all files existed, tests green) |
| Escalated | 0 |

All Wave 0 test files (`signup.test.ts`, `approval.test.ts`, `cpf-hash.test.ts`) were confirmed present and green.
Suite: **13 test files · 63 tests · 0 failures** (`pnpm --filter @turismo/api test --run`, 2.23s).
VALIDATION.md was a documentation debt — phase execution created the tests but never updated this file.
