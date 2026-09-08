---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Governança & Destinos Compartilhados
status: executing
last_updated: "2026-09-06T15:09:01.574Z"
last_activity: 2026-09-06 -- Phase 29-01 executed (2 commits)
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 1
  completed_plans: 1
  percent: 14
---

# STATE.md — Turismo Capivara

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-06)

**Core value:** Guia de turismo publica roteiros e gerencia reservas digitalmente. Turista encontra, reserva e paga com PIX — sem WhatsApp, sem dinheiro em espécie.
**Current focus:** Milestone v3.0 — Governança & Destinos Compartilhados

## Current Position

Phase: 29 — Schema Aditivo & Backfill
Plan: 29-01 ✅
Status: Executed — pending verification
Last activity: 2026-09-06 -- Phase 29-01 executed with 2 commits

## Decisões estratégicas

- **Beachhead:** Serra da Capivara (PI) como destino inicial — UNESCO, sem digitalização, guias dependem de WhatsApp
- **Modelo de negócio:** Comissão 3–5% por reserva, não assinatura mensal
- **Parceiro institucional alvo:** FUMDHAM / SETUR-PI — abordar após MVP com dados de uso reais
- **Multi-tenant:** cada destino/operador é um tenant isolado por slug — arquitetura já implementada
- **Motor de reserva:** trava transacional anti-overbooking já existe (POST /bookings com prisma.$transaction)
- **Pagamento:** apenas PIX (Mercado Pago) no MVP — cartão de crédito é pós-MVP
- **Discovery:** listagem simples por destino no MVP — busca avançada e comparação são pós-MVP
- **Guest checkout:** turista não precisa criar conta para reservar (Phase 6)
- **v3.0: Sem SUPER_ADMIN** — dono opera via API key + cURL/script; dashboard read-only; ações destrutivas com equipe técnica
- **v3.0: Destinos compartilhados** — N:M entre Tenant e Destination; qualquer operadora aprovada pode operar em qualquer destino

## Decisões técnicas

- Zod v4: `ZodError.issues` (não `.errors`) — todos os catch blocks usam `err.issues.map()`
- LGPD: booking rows preservados após anonimização do usuário (histórico transacional via customerEmail)
- `ANONYMIZATION_SALT` obrigatório no Railway — fallback de dev intencional
- JWT strategy: `@fastify/jwt` com `fastify.authenticate` decorator — não usar `request.jwtVerify()` diretamente
- Tenant lookup: sempre via `tenantSlug` no path param, não via JWT payload
- Prisma: usar `prisma.$transaction` para bookings (anti-overbooking)
- Rate limiting: `@fastify/rate-limit` global via `fastify.register` — webhook MP isento via `config: { rateLimit: false }`
- Sentry: `initSentry()` antes do `buildApp()` — `setupFastifyErrorHandler(app)` filtra `AppError` (não envia ao Sentry)
- CPF: HMAC-SHA256 com `ANONYMIZATION_SALT` — `hashCpf()` em `apps/api/src/shared/hash.ts`
- Email: Resend via `getResend()` em `apps/api/src/shared/email.ts` — fire-and-forget com `void`
- fastify-cron: expiry job registrado em `app.ts` após todos os plugins — `FOR UPDATE SKIP LOCKED` + advisory lock PostgreSQL
- Self-service: opaque 404 para lookup inválido — não revela se email ou código existem individualmente
- v2.1: IDs são CUIDs (`cuid()`) — validar com regex permissiva, nunca UUID pattern
- v2.1: Conflito de agenda usa janela `startsAt` até `startsAt + durationMaxHours*60 + bufferMinutes` — dentro de `prisma.$transaction`
- v2.1: Tiles Maptiler servidos via proxy Next.js route — API key nunca exposta ao client
- v3.0: API key armazenada como hash SHA-256; comparação com `timingSafeEqual` — nunca comparação direta de string
- v3.0: Migrations aditivas e destrutivas em fases separadas (Phase 29 aditivo, Phase 30 destrutivo)
- v3.0: AuditLog imutável por convenção (sem rotas de UPDATE/DELETE) — não usar soft delete aqui

## Performance histórica

| Phase | Plans | Tempo total | Média/plano |
|-------|-------|-------------|-------------|
| 1. Security Hardening | 4 | ~17min | ~4min |
| 2. Cadastro de Guias (parcial) | 1 | ~3min | ~3min |

## Pós-MVP (deferred)

- Busca por texto e filtros avançados
- Comparação de guias lado a lado
- Reviews e avaliações
- Cartão de crédito
- Vitrines de parceiros (hotéis, restaurantes)
- Relatórios institucionais (FUMDHAM / SETUR-PI)
- Templates de email com design visual (NOTIF-05)
- Queue de email com retry via BullMQ/Redis (OPS-04)
- Verificação de email no signup (ONBOARD-04)
- Cache de POIs com Redis/Upstash
- i18n — next-intl
- Report system (flag de conteúdo entre ADMINs)
- Preço predatório — alerta se preço < 50% da média do destino
- Optimistic locking com campo version em Destination
- Status TERMINATED para tenant (remoção definitiva)
- Materialized views para dashboard se queries > 2s

## Accumulated Context

### Roadmap Evolution

- v1.0 MVP shipped (2026-05-13) — 6 phases, 26/26 requirements
- v1.1 Launch Readiness shipped (2026-05-26) — Phases 7–10, 13/13 requirements
- v1.2 UI/UX Polish shipped (2026-06-11) — Phases 11–15
- v1.3 → v2.0 MVP Stability merged (2026-06-26) — Phases 16–23
- v2.1 Multi-Guide & Discovery shipped (2026-07-08) — Phases 24–28, 18 requirements
- v3.0 Governança & Destinos Compartilhados started (2026-09-06) — Phases 29–35, 38 requirements

## Session Continuity

Last session: 2026-09-06T15:08:26.796Z
Stopped at: Phase 29 context gathered
Resume file: None
