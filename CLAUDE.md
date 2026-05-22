# Turismo Capivara — Project Guide

## Project

Marketplace de guias de turismo: turistas encontram, comparam e reservam guias para roteiros específicos com pagamento integrado (PIX via Mercado Pago).

**Stack:** Fastify 5 + Prisma 7 + PostgreSQL (API) · Next.js 16.2 + React 19 (Web) · Railway deployment · pnpm monorepo + Turborepo

## GSD Workflow

This project uses GSD for planning and execution.

**Current state:** 5-phase roadmap initialized. Ready to begin Phase 1.

**Next step:** `/gsd-discuss-phase 1` or `/gsd-plan-phase 1`

### Phase Overview

| Phase | Name | Goal |
|-------|------|------|
| 1 | Security Hardening | Validação de input (Zod), CORS/Helmet, auth em booking, LGPD |
| 2 | User Access & Guide Onboarding | Registro turista/guia, aprovação de guia, perfis públicos |
| 3 | Itineraries & Availability | Criação de roteiros, multi-guia por roteiro, calendário de slots |
| 4 | Marketplace Discovery | Filtros, comparação de guias, busca, vitrines de parceiros |
| 5 | Booking & Payments | Reserva transacional + PIX/cartão + repasse ao guia |

## Key Conventions

- **Multi-tenant:** todas as entidades pertencem a um `Tenant` (isolado por slug)
- **Roles:** ADMIN, ATENDENTE, CONDUTOR (guia), CLIENTE (turista)
- **Error messages:** em português (ex: SLOT_NOT_FOUND, SLOT_UNAVAILABLE)
- **Transactions:** usar `prisma.$transaction` para operações de booking (anti-overbooking)
- **Validation:** Zod schemas para todas as rotas (Phase 1 fix — não pular)

## AI Execution & Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.
**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

**1. Think Before Coding**
* Don't assume. Don't hide confusion. Surface tradeoffs.
* Before implementing: State your assumptions explicitly. If uncertain, ask.
* If multiple interpretations exist, present them - don't pick silently.
* If a simpler approach exists, say so. Push back when warranted.
* If something is unclear, stop. Name what's confusing. Ask.

**2. Simplicity First**
* Minimum code that solves the problem. Nothing speculative.
* No features beyond what was asked.
* No abstractions for single-use code.
* No "flexibility" or "configurability" that wasn't requested.
* No error handling for impossible scenarios.
* If you write 200 lines and it could be 50, rewrite it.
* Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

**3. Surgical Changes**
* Touch only what you must. Clean up only your own mess.
* When editing existing code:
  * Don't "improve" adjacent code, comments, or formatting.
  * Don't refactor things that aren't broken.
  * Match existing style, even if you'd do it differently.
  * If you notice unrelated dead code, mention it - don't delete it.
* When your changes create orphans:
  * Remove imports/variables/functions that YOUR changes made unused.
  * Don't remove pre-existing dead code unless asked.
* **The test:** Every changed line should trace directly to the user's request.

**4. Goal-Driven Execution**
* Define success criteria. Loop until verified.
* Transform tasks into verifiable goals:
  * "Add validation" → "Write tests for invalid inputs, then make them pass"
  * "Fix the bug" → "Write a test that reproduces it, then make it pass"
  * "Refactor X" → "Ensure tests pass before and after"
* For multi-step tasks, state a brief plan:
  1. [Step] → verify: [check]
  2. [Step] → verify: [check]
  3. [Step] → verify: [check]
* Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

*These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.*

## Critical Security Issues (Phase 1 must fix)

1. **Input validation missing** — nenhuma rota valida payload em runtime
2. **CORS hardcoded** — `localhost:3000` hardcoded, não configurável por env
3. **@fastify/helmet** instalado mas não registrado no server
4. **Booking endpoints sem auth** — cancel/confirm PATCH não exigem JWT

## Architecture Notes

- API: `apps/api/src/` — módulos em `modules/{auth,bookings,packages,tenants}/`
- Web: `apps/web/src/` — Next.js App Router
- Schema: `apps/api/prisma/schema.prisma`
- Codebase map: `.planning/codebase/`

## Planning Artifacts

- `.planning/PROJECT.md` — contexto e decisões
- `.planning/REQUIREMENTS.md` — 26 requisitos v1 com traceability
- `.planning/ROADMAP.md` — 5 fases com critérios de sucesso
- `.planning/research/` — stack, features, pitfalls
- `.planning/codebase/` — mapeamento da arquitetura existente