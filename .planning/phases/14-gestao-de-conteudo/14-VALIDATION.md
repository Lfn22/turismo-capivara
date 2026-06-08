---
phase: 14
slug: gestao-de-conteudo
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-08
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `apps/api/vitest.config.ts` |
| **Quick run command** | `pnpm --filter api test --run` |
| **Full suite command** | `pnpm --filter api test --run && pnpm --filter web build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter api test --run`
- **After every plan wave:** Run `pnpm --filter api test --run && pnpm --filter web build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | DEST-01 | T-14-01 | approvalStatus defaults to PENDING | unit | `pnpm --filter api test --run` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | DEST-03 | T-14-02 | Only ADMIN/SUPER_ADMIN can approve | unit | `pnpm --filter api test --run` | ❌ W0 | ⬜ pending |
| 14-01-03 | 01 | 1 | DEST-04 | T-14-03 | Ownership check: guia can only edit own destination | unit | `pnpm --filter api test --run` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 1 | DEST-02 | T-14-04 | Upload returns R2 URL, not local path | integration | manual | — | ⬜ pending |
| 14-03-01 | 03 | 2 | ROT-01 | — | N/A | unit | `pnpm --filter api test --run` | ❌ W0 | ⬜ pending |
| 14-03-02 | 03 | 2 | ROT-02 | — | N/A | unit | `pnpm --filter api test --run` | ❌ W0 | ⬜ pending |
| 14-04-01 | 04 | 3 | DEST-01 | — | N/A | e2e | `pnpm --filter web build` | ✅ | ⬜ pending |
| 14-04-02 | 04 | 3 | DEST-03 | T-14-02 | Approval UI only visible to ADMIN | e2e | `pnpm --filter web build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/modules/tenants/destinations/__tests__/destinations.test.ts` — stubs para DEST-01, DEST-03, DEST-04 (ownership, approval status, role checks)
- [ ] `apps/api/src/modules/tenants/packages/__tests__/packages-enrichment.test.ts` — stubs para ROT-01, ROT-02, ROT-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Upload foto para Cloudflare R2 | DEST-02 | Requer bucket R2 real configurado | 1. Criar destino via form 2. Fazer upload de imagem 3. Verificar URL retornada é `https://*.r2.dev/...` |
| Foto aparece na página pública `/destinos` | DEST-02 | Depende de R2 + aprovação | 1. Aprovar destino via super-admin 2. Navegar para `/destinos` 3. Verificar thumbnail carrega |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
