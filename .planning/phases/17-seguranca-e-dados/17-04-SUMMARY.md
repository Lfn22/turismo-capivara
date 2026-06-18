---
phase: 17-seguranca-e-dados
plan: "04"
subsystem: webhooks, packages, frontend-slots
tags: [webhook, idempotency, dedup, slot-validation, zod, fail-fast]
requirements: [SEC-04, DATA-04]
dependency_graph:
  requires: [17-01]
  provides: [webhook-idempotency, slot-date-validation]
  affects: [bookings, packages, disponibilidade-ui]
tech_stack:
  added: []
  patterns: [ProcessedWebhookEvent-dedup, Zod-refine-future-date, onBlur-fail-fast]
key_files:
  modified:
    - apps/api/src/modules/webhooks/webhooks.routes.ts
    - apps/api/src/modules/packages/packages.routes.ts
    - apps/web/app/[slug]/(painel)/painel/disponibilidade/page.tsx
decisions:
  - "D-08/D-09: dedup via ProcessedWebhookEvent.findUnique antes de processar booking; create após — sem cron (OPS phase)"
  - "D-13/D-15: refine Zod startsAt > new Date(); frontend valida onBlur e bloqueia submit"
  - "SLOT_DATE_PAST retornado como { code, message } — detecção por mensagem Zod no catch do handler"
metrics:
  duration: "~20min"
  completed: "2026-06-18"
  tasks_completed: 2
  files_modified: 3
---

## Plan 17-04: Webhook Dedup + Validação Data Slot

**Status:** Complete

**One-liner:** Idempotência de webhook via ProcessedWebhookEvent + rejeição de slots no passado com Zod refine e fail-fast no frontend.

## Tasks Completed

1. **Task 1 — Deduplicação de webhook via ProcessedWebhookEvent**
   - `findUnique({ where: { id: paymentId } })` antes de qualquer lógica de booking
   - Retorna `200 { ok: true, deduplicated: true }` imediatamente se já processado
   - `create({ data: { id: paymentId } })` após processamento bem-sucedido
   - Cleanup de registros antigos diferido para fase OPS (D-09)
   - `rawBody: true` e HMAC mantidos intactos

2. **Task 2 — Validação de data futura (backend + frontend)**
   - `createSlotBodySchema`: `.refine((val) => new Date(val) > new Date())` em `startsAt`
   - Handler POST /slots: detecta issue Zod pela mensagem e retorna `{ code: 'SLOT_DATE_PAST', message: 'A data do slot deve ser no futuro' }`
   - Frontend `disponibilidade/page.tsx`: `isStartsAtInPast()` + `onBlur` exibe erro inline
   - `validateForm()` bloqueia submit — API não é chamada com data passada

## Files Modified

- `apps/api/src/modules/webhooks/webhooks.routes.ts` — dedup + registro ProcessedWebhookEvent
- `apps/api/src/modules/packages/packages.routes.ts` — Zod refine + resposta SLOT_DATE_PAST
- `apps/web/app/[slug]/(painel)/painel/disponibilidade/page.tsx` — validação onBlur + validateForm

## Commits

- `f4243fb` — feat(17-04): webhook dedup via ProcessedWebhookEvent (SEC-04)
- `feb3ad9` — feat(17-04): validação data futura em slots — backend Zod + frontend fail-fast (DATA-04)

## Deviations

**[Desvio de localização — arquivo frontend]**
- O plano referenciava `apps/web/src/app/(tenant)/roteiros/[slug]/slots/new/page.tsx` como localização do formulário de criação de slot.
- Esse caminho não existe no projeto. O formulário real está em `apps/web/app/[slug]/(painel)/painel/disponibilidade/page.tsx`.
- A validação foi implementada no arquivo correto sem criar um arquivo inexistente.
- Nenhuma funcionalidade foi comprometida — os critérios de acceptance foram atendidos no local real.

## Next Phase Readiness

Ready for Wave 3 (17-03 — Booking Security).

## Self-Check

- [x] `webhooks.routes.ts` contém `processedWebhookEvent.findUnique` (linha 106) e `.create` (linha 197)
- [x] `findUnique` ocorre antes de `booking.findFirst` e qualquer update
- [x] `packages.routes.ts` contém `SLOT_DATE_PAST` e `'A data do slot deve ser no futuro'`
- [x] `packages.routes.ts` contém `.refine(` no schema Zod de startsAt
- [x] `disponibilidade/page.tsx` contém `isStartsAtInPast` e bloqueia submit antes do fetch
- [x] Commits f4243fb e feb3ad9 existem em main
