---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: — UI/UX Polish + Guia Experience
status: executing
stopped_at: "Phase 12.1 Plan 01 complete — idempotency key for POST /bookings"
last_updated: "2026-06-03T11:41:50Z"
last_activity: "2026-06-03 — Phase 12.1 Plan 01: idempotencyKey field + dedup logic in POST /bookings"
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 11
  completed_plans: 11
  percent: 100
---

# STATE.md — Turismo Capivara

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-26)

**Core value:** Guia de turismo publica roteiros e gerencia reservas digitalmente. Turista encontra, reserva e paga com PIX — sem WhatsApp, sem dinheiro em espécie.
**Current focus:** Milestone v1.2 UI/UX Polish + Guia Experience — Phase 12 complete, next: Phase 12.1 Pre-Launch Hardening

## Current Position

Phase: Phase 12.1 (in progress — 1/3 plans complete)
Plan: 12.1-01 (completed)
Status: Plan 12.1-01 complete — idempotencyKey field + dedup logic deployed to Railway PostgreSQL.
Last activity: 2026-06-03 — Phase 12.1 Plan 01: idempotencyKey in Booking model, POST /bookings dedup via Idempotency-Key header

## Decisões estratégicas

- **Beachhead:** Serra da Capivara (PI) como destino inicial — UNESCO, sem digitalização, guias dependem de WhatsApp
- **Modelo de negócio:** Comissão 3–5% por reserva, não assinatura mensal
- **Parceiro institucional alvo:** FUMDHAM / SETUR-PI — abordar após MVP com dados de uso reais
- **Multi-tenant:** cada destino/operador é um tenant isolado por slug — arquitetura já implementada
- **Motor de reserva:** trava transacional anti-overbooking já existe (POST /bookings com prisma.$transaction)
- **Pagamento:** apenas PIX (Mercado Pago) no MVP — cartão de crédito é pós-MVP
- **Discovery:** listagem simples por destino no MVP — busca avançada e comparação são pós-MVP
- **Guest checkout:** turista não precisa criar conta para reservar (Phase 6)

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
- QR code: `qrCode` persistido em `Booking` no momento do POST /bookings (MP response)
- React QR: `react-qr-code ^2.0.21` em apps/web — SVG QR no browser
- Providers wrapper: `providers.tsx` Client Component wraps `SessionProvider`; `layout.tsx` stays Server Component
- Middleware: `withAuth` from `next-auth/middleware` — rotas protegidas por `matcher`
- Super-admin: painel em `/super-admin/operadoras` usa API proxy routes Next.js com NextAuth JWT como Bearer
- `TenantApprovalStatus` enum: `PENDING | APPROVED | REJECTED` — migration `20260523_add_tenant_approval_status`
- CNPJ: `String?` no Prisma schema, required no Zod `signupBodySchema` — consistência intencional
- Perfil próprio: PUT /tenants/:slug/guides/me
- Login global: email-first two-step — POST /auth/lookup-tenant descobre tenant pelo email, sem slug na URL
- Password reset: PasswordResetToken model, POST /auth/request-password-reset + PUT /auth/reset-password
- auth-client.ts: response shape `data.tenant.tenantSlug` no lookup-tenant
- Idempotency: header `Idempotency-Key` em POST /bookings — lookup por `idempotencyKey` ANTES do $transaction, escopado por tenant

## Performance histórica

| Phase | Plans | Tempo total | Média/plano |
|-------|-------|-------------|-------------|
| 1. Security Hardening | 4 | ~17min | ~4min |
| 2. Cadastro de Guias (parcial) | 1 | ~3min | ~3min |

## Pós-MVP (deferred)

- Busca por texto e filtros avançados
- Comparação de guias lado a lado
- Multi-guia por roteiro
- Reviews e avaliações
- Cartão de crédito
- Vitrines de parceiros (hotéis, restaurantes)
- Relatórios institucionais (FUMDHAM / SETUR-PI)
- Templates de email com design visual (NOTIF-05)
- Queue de email com retry via BullMQ/Redis (OPS-04)
- Verificação de email no signup (ONBOARD-04)
- Links de recuperação com token por email (TOURIST-03)

## Accumulated Context

### Roadmap Evolution

- Phase 6 added: Interface do Turista (2026-05-12) — already defined in ROADMAP.md; planning directory created
- v1.1 milestone complete (2026-05-26) — Phases 7–10, 13 plans, 13/13 requirements
- v1.2 roadmap created (2026-05-28) — Phases 11–14, 34 requirements, 100% coverage
- Phase 12.1 inserted after Phase 12 (2026-06-02): Pre-Launch Hardening — idempotência bookings, connection pool, smoke test PIX, doc early adopters (URGENT)
- Phase 12 complete (2026-06-02): Login Global — /login two-step, password reset flow, user verified end-to-end

## Session Continuity

Last session: 2026-06-02T20:00:00.000Z
Stopped at: Phase 12 complete — user verified end-to-end login flow
Resume file: None

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260513-xrp | Wire up dashboard page | 2026-05-13 | 6ba428e | [260513-xrp-wire-dashboard-page](./quick/260513-xrp-wire-dashboard-page/) |
