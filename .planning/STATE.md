---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: — UI/UX Polish + Guia Experience
status: executing
stopped_at: Phase 20 Plan 04 concluído — fase 20 completa
last_updated: "2026-06-30T13:15:00Z"
last_activity: 2026-06-30 -- Phase 20 Plan 04 executed (paginação Carregar mais no super-admin)
progress:
  total_phases: 13
  completed_phases: 9
  total_plans: 41
  completed_plans: 39
  percent: 95
---

# STATE.md — Turismo Capivara

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-17)

**Core value:** Guia de turismo publica roteiros e gerencia reservas digitalmente. Turista encontra, reserva e paga com PIX — sem WhatsApp, sem dinheiro em espécie.
**Current focus:** Phase 20 — Polimento e Dados Públicos

## Current Position

Phase: 20 (Polimento e Dados Públicos) — EXECUTING
Plan: 4 of 4 (concluído)
Status: Phase 20 completa — todos os 4 planos executados
Last activity: 2026-06-30 -- Phase 20 Plan 04 executed (paginação Carregar mais no super-admin)

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
- `Destination.approvalStatus`: reusa enum `ApprovalStatus` (não TenantApprovalStatus) — migration `20260608174257`
- `Destination.createdById`: FK para `User.id` com ON DELETE SET NULL — relação nomeada `DestinationCreator`
- `TourPackage.photos` / `highlights`: `String[]` nativo PostgreSQL (não JSON) — consistente com Destination model
- Destination CRUD API: input usa `name`, service mapeia para `title` (campo DB) — separação semântica intencional
- Destination ownership: `createdById === request.user.sub` — guia só edita/deleta os próprios; APPROVED imutável para guias
- Zod v4 enum: usar `{ error: 'msg' }` (não `errorMap`) para mensagens customizadas em `z.enum()`
- CNPJ: `String?` no Prisma schema, required no Zod `signupBodySchema` — consistência intencional
- Perfil próprio: PUT /tenants/:slug/guides/me
- Login global: email-first two-step — POST /auth/lookup-tenant descobre tenant pelo email, sem slug na URL
- Password reset: PasswordResetToken model, POST /auth/request-password-reset + PUT /auth/reset-password
- auth-client.ts: response shape `data.tenant.tenantSlug` no lookup-tenant
- Idempotency: header `Idempotency-Key` em POST /bookings — lookup por `idempotencyKey` ANTES do $transaction, escopado por tenant
- Connection pool: Prisma 7 usa `prisma.config.ts` para `url`/`directUrl` — schema.prisma não precisa desses campos; DATABASE_URL com `?connection_limit=10&pool_timeout=2`, DIRECT_URL sem params para migrations
- R2 client: lazy initialization via `getR2Client()` factory — lê env vars no momento da chamada, não no import (evita crash em test/dev)
- R2 auth: `CLOUDFLARE_API_TOKEN` formato `accessKeyId:secretAccessKey` (split em `:`)
- Vitest mocks @aws-sdk: `PutObjectCommand`/`DeleteObjectCommand` devem usar `function` keyword (não arrow fn) para suportar `new` como construtor
- Vitest + @fastify/multipart: mockar o plugin quebra `decorateRequest` por isolamento de módulos — usar real multipart body com Buffer manual em testes de rota
- D-12: 403 em tenant não aprovado usa mensagem genérica `'Reservas indisponíveis no momento.'` — não revelar motivo real ao turista
- AppError: construtor 2-param `(message: string, statusCode = 400)` — sem terceiro argumento de código

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
- Phase 12.1 complete (2026-06-03): Pre-Launch Hardening — idempotência bookings (Idempotency-Key header), connection pool Railway, página /acesso, smoke test PIX 4/6 PASS
- v1.2 milestone complete (2026-06-11) — Phases 11–15, UI/UX polish, login global, gestão de conteúdo
- v1.3 milestone started (2026-06-17) — 24 requirements em auditoria end-to-end: PAY, SEC, DATA, UX, OPS, POL — Phases 16–20
- v2.0 milestone created (2026-06-26) — Auditoria executiva MVP (7 especialistas, 12 pilares): 37 requisitos, 8 fases (21 Hardening + 22 Email novas; 13, 16, 18, 19, 20 absorvidas do v1.3), 21 planos total. Próximo: Phase 21

## Session Continuity

Last session: 2026-06-22T14:38:00-03:00
Stopped at: Phase 18 planejada (2 planos criados, verificação aprovada) — pronta para /gsd-execute-phase 18
Resume file: None

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260513-xrp | Wire up dashboard page | 2026-05-13 | 6ba428e | [260513-xrp-wire-dashboard-page](./quick/260513-xrp-wire-dashboard-page/) |
