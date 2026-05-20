# Phase 9: Booking Lifecycle Automation - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Bookings PENDING expiram automaticamente após a janela configurada, liberando a capacidade do slot. Cada transição de estado da reserva dispara o email transacional correto para o turista ou guia.

**Em escopo:**
- Cron job (a cada 60s) que expira bookings PENDING com `expiresAt` no passado → EXPIRED + decrement `slot.booked`
- Lock de concorrência via PostgreSQL advisory lock (pg_try_advisory_lock) para múltiplas instâncias
- `expiresAt` calculado em `POST /bookings` (createdAt + BOOKING_EXPIRY_MINUTES)
- NOTIF-01: Email para turista ao criar booking (PENDING) — código PIX, QR code, prazo
- NOTIF-02: Email para turista quando pagamento PIX é confirmado (CONFIRMED via webhook MP)
- NOTIF-03: Email para CONDUTOR quando admin aprova conta de guia
- NOTIF-04: Email para turista quando booking expira (EXPIRED)
- Todos os templates texto simples (padrão Phase 8)

**Fora de escopo:**
- React Email / templates visuais (NOTIF-05 — v1.2)
- Queue de email com retry (OPS-04 — v1.2)
- Config de expiração por tenant
- Emails de rejeição de guia (sem requisito explícito nessa fase)

</domain>

<decisions>
## Implementation Decisions

### Templates de Email
- **D-01:** Templates texto simples — mesmo padrão de Phase 8 (`approval-email.ts`). Sem HTML, sem React Email.
- **D-02:** Templates visuais (NOTIF-05) explicitamente deferidos para v1.2. Phase 8 CONTEXT.md disse "Phase 9" mas REQUIREMENTS.md é a fonte de verdade — v1.2.
- **D-03:** Mesmo endereço FROM já configurado em Phase 8 para aprovação de operadoras. Não criar novo remetente.
- **D-04:** Novos templates de email ficam em `apps/api/src/modules/bookings/emails/` (espelhando padrão de `tenants/emails/`).

### Janela de Expiração
- **D-05:** Env var `BOOKING_EXPIRY_MINUTES` (default: 30) — configurável no Railway sem redeploy.
- **D-06:** `expiresAt` é calculado e gravado em `POST /bookings` no momento da criação: `new Date(Date.now() + minutes * 60_000)`.
- **D-07:** Cron job filtra `WHERE status = PENDING AND expiresAt <= NOW()` — não recalcula, confia no campo gravado.

### Arquitetura do Cron
- **D-08:** Usar `fastify-cron` plugin — integrado ao lifecycle Fastify (start/stop automático com o servidor).
- **D-09:** Registrar o plugin em `apps/api/src/app.ts` junto aos demais plugins.
- **D-10:** Job roda a cada 60s (OPS-01). Implementar com lock: `SELECT pg_try_advisory_lock(123456789)` via Prisma `$queryRaw`. Se lock não obtido, skip silencioso (outra instância está rodando).
- **D-11:** Dentro do lock, usar `prisma.$transaction` para o batch de expiração: `booking.updateMany(EXPIRED)` + loop de `slot.update(booked--)`. Atomicidade por booking, não por batch (evitar long transaction).
- **D-12:** Se envio de email falhar durante o cron, logar o erro e continuar (fire-and-forget). Não reverter a expiração do booking.

### NOTIF-03 — Guia Aprovado
- **D-13:** Email para CONDUTOR implementado inline no handler de aprovação em `guides.routes.ts` — mesmo padrão de Phase 8 (sem service layer).
- **D-14:** Conteúdo: "Sua conta de guia foi aprovada. Acesse seu painel em: capi.turismo/[slug]/guia/perfil"
- **D-15:** Graceful fallback: se `RESEND_API_KEY` ausente, logar warning e pular (mesmo comportamento de Phase 8).

### Claude's Discretion
- Ordem de registro do plugin fastify-cron em `app.ts` (após plugins existentes, antes de rotas)
- Número mágico do advisory lock (escolher constante nomeada)
- Estrutura interna dos templates de texto (saudação, corpo, assinatura)
- Tratamento de `RESEND_API_KEY` ausente já estabelecido em Phase 8 — reutilizar exato mesmo padrão

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos e Roadmap
- `.planning/ROADMAP.md` §Phase 9 — Goal, success criteria, requirements list
- `.planning/REQUIREMENTS.md` §OPS-01, §NOTIF-01..NOTIF-04 — Acceptance criteria completos

### Schema e Modelos
- `apps/api/prisma/schema.prisma` §model Booking — campos `expiresAt`, `status`, `customerEmail`
- `apps/api/prisma/schema.prisma` §enum BookingStatus — PENDING, CONFIRMED, EXPIRED

### Padrões de Email Estabelecidos (Phase 8)
- `apps/api/src/modules/tenants/emails/approval-email.ts` — template função texto simples
- `apps/api/src/modules/tenants/emails/rejection-email.ts` — template com motivo de rejeição
- `.planning/phases/08-operator-onboarding/08-CONTEXT.md` §D-13..D-15 — decisões Resend (FROM, graceful fallback, texto simples)

### Código a Modificar
- `apps/api/src/app.ts` — registrar fastify-cron plugin
- `apps/api/src/modules/bookings/bookings.routes.ts` — adicionar cálculo de `expiresAt` no POST + emails NOTIF-01/02/04
- `apps/api/src/modules/guides/guides.routes.ts` — adicionar email NOTIF-03 no handler de aprovação

### Decisões de Fases Anteriores
- `.planning/phases/07-platform-hardening/07-CONTEXT.md` §D-04 — webhook MP isento de rate limit
- `.planning/STATE.md` §Decisões técnicas — EXPIRED transition já usa `prisma.$transaction` + slot decrement (padrão estabelecido)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/modules/tenants/emails/approval-email.ts` — função `approvalEmailText(params): string`, replicar padrão para bookings
- `resend` v6.12.3 já no `apps/api/package.json` — sem nova dependência
- `expiresAt DateTime?` e `BookingStatus.EXPIRED` já no schema Prisma — sem migration para esses campos
- `apps/api/src/services/payment.service.ts` — padrão de service standalone para referência de estrutura

### Established Patterns
- Email inline no handler (sem service layer) — padrão de Phase 8
- `prisma.$transaction` para operações atômicas de booking — padrão estabelecido em Phase 4/5
- `app.register()` para plugins Fastify em `app.ts` — onde registrar fastify-cron
- Error handler em `app.ts`: erros não tratados → log + 500 (não expor stack)

### Integration Points
- `POST /bookings` em `bookings.routes.ts` — adicionar `expiresAt` no `prisma.booking.create()` + disparo de NOTIF-01
- Webhook Mercado Pago em `bookings.routes.ts` — adicionar disparo de NOTIF-02 quando status → CONFIRMED
- `PATCH .../guides/:id/approve` em `guides.routes.ts` — adicionar disparo de NOTIF-03
- `app.ts` — registrar fastify-cron com o job de expiração

</code_context>

<specifics>
## Specific Ideas

- Cron a cada 60s conforme OPS-01 — não configurável por env (fixo)
- Advisory lock ID: usar constante nomeada `BOOKING_EXPIRY_LOCK_ID = 1_234_567_890` (evitar magic number)
- Env var `BOOKING_EXPIRY_MINUTES` com default 30 — documentar no README de deploy

</specifics>

<deferred>
## Deferred Ideas

- NOTIF-05: Templates React Email / design visual — v1.2 (REQUIREMENTS.md §v1.1 Future Requirements)
- OPS-04: Queue de email com retry automático via BullMQ/Redis — v1.2
- Emails de rejeição de guia (CONDUTOR rejeitado) — não há requisito explícito em v1.1
- Config de expiração por tenant (cada operadora com sua própria janela)

</deferred>

---

*Phase: 09-booking-lifecycle-automation*
*Context gathered: 2026-05-19*
