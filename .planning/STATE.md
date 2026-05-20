---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Launch Readiness
status: in_progress
stopped_at: ""
last_updated: "2026-05-20T11:25:00-03:00"
last_activity: 2026-05-20
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 5
  completed_plans: 7
  percent: 58
---

# STATE.md — Turismo Capivara

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-17)

**Core value:** Guia de turismo publica roteiros e gerencia reservas digitalmente. Turista encontra, reserva e paga com PIX — sem WhatsApp, sem dinheiro em espécie.
**Current focus:** Milestone v1.1 — Launch Readiness

## Current Position

Phase: 9
Plan: 02 (complete)
Status: Phase 9 in progress — Plan 02 complete (four email template modules created)
Last activity: 2026-05-20 — Phase 9 Plan 02 complete (booking lifecycle email templates)

## Decisões estratégicas

- **Beachhead:** Serra da Capivara (PI) como destino inicial — UNESCO, sem digitalização, guias dependem de WhatsApp
- **Modelo de negócio:** Comissão 3–5% por reserva, não assinatura mensal
- **Parceiro institucional alvo:** FUMDHAM / SETUR-PI — abordar após MVP com dados reais
- **Multi-tenant:** cada destino/operador é um tenant isolado por slug — arquitetura já implementada
- **Motor de reserva:** trava transacional anti-overbooking já existe (POST /bookings com prisma.$transaction)
- **Pagamento:** apenas PIX (Mercado Pago) no MVP — cartão de crédito é pós-MVP
- **Discovery:** listagem simples por destino no MVP — busca avançada e comparação são pós-MVP
- **Guest checkout:** turista não precisa criar conta para reservar (Phase 6)

## Decisões técnicas

- Zod v4: `ZodError.issues` (não `.errors`) — todos os catch blocks usam `err.issues.map()`
- LGPD: booking rows preservados após anonimização do usuário (histórico transacional via customerEmail)
- `ANONYMIZATION_SALT` obrigatório no Railway — fallback de dev intencional
- Rotas escopadas por tenant: padrão `/tenants/:slug/resource` com helper `parseParams`
- Aprovação de guia: `authenticate + authorize([Role.ADMIN])` — padrão já estabelecido
- conductorId always set from JWT.sub — never from request body (T-03-02-02 mitigation)
- Soft-delete via active=false — packages remain in DB for historical booking integrity
- Slot cancellation ownership check inside $transaction — atomic with mutation (prevents TOCTOU)
- Booking cascade on slot cancel filters strictly to status=PENDING — CONFIRMED bookings never auto-cancelled
- Idempotency guard (slot.status === CANCELLED → 400) inside $transaction — safe against race conditions
- fastify-raw-body registrado com global:false — opt-in por rota para validação HMAC de webhooks Mercado Pago
- customerCpf opcional no Booking — identificação do pagador PIX sem obrigatoriedade em reservas existentes
- EXPIRED no BookingStatus — PIX com QR code gerado mas não pago dentro do prazo
- Webhook lookup por external_reference (bookingId) — evita race condition com paymentId ainda não gravado
- HMAC manifest MP 2024+: "id:<paymentId>;request-date:<ts>;" — não usa rawBody, usa manifest estruturado
- Return 200 em falha do MP API — evita flood de retentativas
- EXPIRED transition: prisma.$transaction envolve booking.update + departureSlot.booked decrement atomicamente
- Phase 5 guide endpoints: conductorId sempre do JWT.sub — nunca de params de URL (T-05-02 mitigação)
- next-auth@4.24.14 escolhido para autenticação do painel — NEXTAUTH_SECRET em .env.local (gitignored)
- react-calendar@6.0.1 instalado para tela de disponibilidade (Phase 5 Plan 05)
- react-calendar v6 não tem prop tileStyle — usar tileContent com elemento div para indicadores de cor por tile
- Providers wrapper pattern: providers.tsx Client Component wraps SessionProvider; layout.tsx stays Server Component
- Middleware uses withAuth from next-auth/middleware — role guard via token?.role check on JWT-signed claims
- signIn pages config set to /login (fallback); real tenant login at /[slug]/login
- Client Components com dynamic params usam use(params) — params é Promise<{slug}> no Next.js 16
- Dashboard RSC: token via session.user.token (campo apiToken do callback jwt em auth.ts)
- approvalStatus guard removido do PATCH guides/me/profile — PENDING guides devem completar perfil antes da aprovação (chicken-and-egg)
- Rejeitar flow usa modal com textarea obrigatório; Aprovar é PATCH direto sem confirmação
- portfolioPhotos aceito como string[] com validação de URL no schema Zod
- Badge "Guia Verificado" condicionado a approvalStatus === APPROVED via /auth/me
- Sentry DSN lido de process.env.SENTRY_DSN — initSentry() no-op quando ausente; AppError filtrada antes de captureException (D-07)

## Fase 2 — Contexto de execução

Dois planos já escritos (não executados):
- `02-01-PLAN.md`: extensão do schema Prisma (approvalStatus, cpf, bio, photo, specialties, regions, rejectionReason ao User)
- `02-02-PLAN.md`: POST /auth/register diferenciando CLIENTE vs CONDUTOR

Planos ainda a escrever para completar a Fase 2:
- Admin: GET + PATCH de aprovação de guias
- Perfil público: GET /tenants/:slug/guides e GET /tenants/:slug/guides/:id
- Perfil próprio: PUT /tenants/:slug/guides/me

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
- Notificações automáticas por email/WhatsApp

## Accumulated Context

### Roadmap Evolution
- Phase 6 added: Interface do Turista (2026-05-12) — already defined in ROADMAP.md; planning directory created

## Session Continuity

Last session: 2026-05-12T18:21:00Z
Stopped at: 05-06 complete — Perfil do Guia + Aprovacao Admin + 6 bug fixes de auditoria
Resume file: None — Phase 5 completa

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260513-xrp | Wire up dashboard page | 2026-05-13 | 6ba428e | [260513-xrp-wire-dashboard-page](./quick/260513-xrp-wire-dashboard-page/) |
