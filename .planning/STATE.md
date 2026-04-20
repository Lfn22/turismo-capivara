---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Plan 01-04 completed — LGPD data-rights endpoints (SEC-04)
last_updated: "2026-04-20T11:36:56Z"
last_activity: 2026-04-20
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 4
  completed_plans: 4
  percent: 100
---

# STATE.md — Turismo Capivara

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-17)

**Core value:** Turista encontra, compara e reserva um guia para seu roteiro desejado — tudo em um único fluxo com pagamento integrado.
**Current focus:** Phase 1 — Security Hardening

## Current Position

Phase: 1 of 5 (Security Hardening)
Plan: 4 of 4 in current phase
Status: Ready to execute
Last activity: 2026-04-20

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 4
- Average duration: ~4m
- Total execution time: ~17m

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

## Accumulated Context

### Decisions

- Marketplace (não SaaS): turistas comparam guias para o mesmo roteiro — diferencial central
- Brownfield: reaproveitar Fastify 5 + Prisma 7 + Next.js 16; não reconstruir do zero
- SEC em Phase 1: 6 vulnerabilidades críticas bloqueiam pagamentos — corrigir primeiro
- Pix obrigatório (Mercado Pago preferencial); cartão de crédito como fallback
- Regiões como tags/filtros, não entidades administrativas — simplicidade para MVP
- Guide approval por admin antes de publicar roteiros — controle de qualidade e liability

- Zod v4 uses ZodError.issues (not .errors) — all route catch blocks use err.issues.map()
- LGPD: booking rows preserved after user anonymization (transactional history via customerEmail linkage)
- ANONYMIZATION_SALT env var required in Railway production — dev fallback intentional

### Pending Todos

None yet.

### Blockers/Concerns

- CORS hardcoded para localhost:3000 → resolvido em Phase 1 (SEC-02)
- Endpoints de booking sem autenticação → resolvido em Phase 1 (SEC-03)
- Sem validação de input no servidor → resolvido em Phase 1 (SEC-01)
- `@fastify/helmet` instalado mas não registrado → resolvido em Phase 1 (SEC-02)
- LGPD data-rights sem implementação → resolvido em Phase 1 (SEC-04)
- tenantSlug "serra-viva" hardcoded no frontend → endereçado em Phase 2 ao desacoplar multi-tenant para marketplace

## Session Continuity

Last session: 2026-04-20T11:36:56Z
Stopped at: Plan 01-04 completed — LGPD data-rights endpoints (SEC-04)
Resume file: None
