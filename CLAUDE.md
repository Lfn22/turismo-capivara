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
