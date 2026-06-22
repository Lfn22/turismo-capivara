---
phase: 17-seguranca-e-dados
verified: 2026-06-22T09:50:00-03:00
status: passed
score: 7/7 must-haves verified
overrides_applied: 0
---

# Phase 17: Segurança e Dados — Verification Report

**Phase Goal:** O sistema resiste a abuso, isola tenants corretamente e mantém integridade dos dados de slot em todos os cenários de cancelamento e criação
**Verified:** 2026-06-22T09:50:00-03:00
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Rate limit de cancel-self é por IP (req.ip), max 3, janela 15 minutos | VERIFIED | `bookings.routes.ts` linha 384: `keyGenerator: (req) => req.ip`, linha 382: `max: 3` |
| 2 | cancel-self usa cancelToken opaco para lookup — não deriva o booking pelo ID | VERIFIED | `bookings.routes.ts` linha 400: `where: { cancelToken: token, tenantId: tenant.id }` |
| 3 | POST /bookings gera cancelToken com crypto.randomBytes(32).toString('hex') dentro do $transaction | VERIFIED | `bookings.routes.ts` linhas 12, 229, 245: `import { randomBytes }`, geração e inclusão no create |
| 4 | Confirmar ou cancelar booking de outro tenant retorna 403 | VERIFIED | `bookings.routes.ts` linhas 640-642 (cancel) e 708-710 (confirm): `booking.tenantId !== user.tenantId → AppError('FORBIDDEN', 403)` |
| 5 | Cancelamento decrementa slot na mesma $transaction | VERIFIED | `bookings.routes.ts` linha 661: `booked: { decrement: booking.pax }` dentro de `prisma.$transaction` (linha 656) |
| 6 | Criar booking com guia não-aprovado retorna 403 com mensagem genérica | VERIFIED | `bookings.routes.ts` linhas 105-108: `approvalStatus !== 'APPROVED' → AppError('Reservas indisponíveis no momento.', 403)` |
| 7 | Webhook com paymentId já processado retorna 200 sem reprocessar | VERIFIED | `webhooks.routes.ts` linhas 106-110: `processedWebhookEvent.findUnique` → `reply.status(200).send({ ok: true, deduplicated: true })` |
| 8 | POST /slots com startsAt no passado retorna 400 com código SLOT_DATE_PAST | VERIFIED | `packages.routes.ts` linha 58: `.refine((val) => new Date(val) > new Date())`, linhas 315-319: detecta issue Zod e retorna `SLOT_DATE_PAST` |
| 9 | Formulário de criação de slot no frontend rejeita data passada antes de chamar API | VERIFIED | `disponibilidade/page.tsx` linha 156: `isStartsAtInPast()`, linha 163: `validateForm()` bloqueia submit antes do fetch |

**Score:** 9/9 truths verified (7 requirements, 9 truths derivadas dos 4 planos)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/prisma/schema.prisma` | cancelToken field + ProcessedWebhookEvent model | VERIFIED | linha 122: `cancelToken String @unique`; linhas 212-215: modelo `ProcessedWebhookEvent` com `id String @id` e `processedAt DateTime @default(now())` |
| `apps/api/prisma/migrations/20260618000001_add_cancel_token_and_webhook_dedup/` | Migration com backfill gen_random_uuid() | VERIFIED | SQL contém `UPDATE "Booking" SET "cancelToken" = gen_random_uuid()::text WHERE "cancelToken" IS NULL`, `ALTER COLUMN SET NOT NULL`, `CREATE TABLE "ProcessedWebhookEvent"` |
| `apps/api/src/modules/bookings/bookings.routes.ts` | cancelToken, IP rate limit, tenant isolation, approval guard, atomic decrement | VERIFIED | Todos os padrões presentes e substantivos — 774 linhas, não é stub |
| `apps/api/src/modules/webhooks/webhooks.routes.ts` | deduplicação via ProcessedWebhookEvent | VERIFIED | `processedWebhookEvent.findUnique` linha 106, `.create` linha 197 |
| `apps/api/src/modules/packages/packages.routes.ts` | Zod refine + SLOT_DATE_PAST | VERIFIED | `.refine()` linha 58, `SLOT_DATE_PAST` linha 318 |
| `apps/web/app/[slug]/(painel)/painel/disponibilidade/page.tsx` | validação client-side data passada | VERIFIED | `isStartsAtInPast()`, `validateForm()`, erro inline onBlur |
| `apps/api/src/__tests__/cancel-self.test.ts` | testes de rate limit por IP e token opaco | VERIFIED | arquivo existe, contém `toBe(429)` na 4a tentativa, test para token inexistente |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `schema.prisma Booking.cancelToken` | `bookings.routes.ts POST /bookings` | `randomBytes(32).toString('hex')` no `$transaction` | WIRED | Importa `randomBytes`, gera na linha 229, passa ao `booking.create` linha 245 |
| `GET /bookings/cancel-self` | `prisma.booking.findFirst` | `where: { cancelToken: token, tenantId }` | WIRED | Linha 400 confirma lookup por token opaco |
| `webhook handler` | `prisma.processedWebhookEvent.findUnique` | `paymentId` como chave de deduplicação | WIRED | `findUnique` linha 106 ocorre antes de qualquer lógica de booking |
| `POST /slots Zod schema` | `startsAt refine` | `new Date(val) > new Date()` | WIRED | `.refine()` na linha 58 do schema, handler captura issue e retorna `SLOT_DATE_PAST` |
| `cancel $transaction` | `prisma.departureSlot.update booked decrement` | `prisma.$transaction` atômica | WIRED | Linhas 656-672: `$transaction` com `booked: { decrement: booking.pax }` |
| `PATCH confirm / PATCH cancel` | `booking.tenantId === user.tenantId` | check antes de mutation | WIRED | Linhas 641 e 709: verificação antes de qualquer update |

### Data-Flow Trace (Level 4)

Não aplicável — nenhum artifact desta fase renderiza dados dinâmicos para o usuário final. Todos são handlers de API, lógica de negócio e validação. A exception é o frontend de disponibilidade, que apenas valida antes de enviar — não renderiza dados do banco.

### Behavioral Spot-Checks

Step 7b: SKIPPED — servidor não está rodando. As verificações foram feitas via análise estática (grep de padrões substantivos).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SEC-01 | 17-02 | Endpoint cancel-self aplica rate limit máx 3 tentativas por 15 min por IP | SATISFIED | `keyGenerator: (req) => req.ip`, `max: 3`, `timeWindow: '15 minutes'` em bookings.routes.ts |
| SEC-02 | 17-01, 17-02 | cancel-self usa token opaco independente do bookingId | SATISFIED | `cancelToken String @unique` no schema; `randomBytes(32)` na criação; `cancelToken: token` no lookup |
| SEC-03 | 17-03 | Handlers confirm/cancel verificam booking pertence ao tenant do JWT | SATISFIED | `booking.tenantId !== user.tenantId → 403` em ambos handlers (linhas 641, 709) |
| SEC-04 | 17-01, 17-04 | Sistema persiste ID de webhook processado e ignora duplicatas | SATISFIED | `ProcessedWebhookEvent` no schema; `findUnique` antes + `create` após em webhooks.routes.ts |
| DATA-01 | 17-03 | Cancelamento libera capacidade do slot em transação atômica | SATISFIED | `booked: { decrement: booking.pax }` dentro de `$transaction` no handler PATCH cancel (linha 656-672) |
| DATA-02 | 17-03 | Bloqueia booking para tenant com approvalStatus !== APPROVED | SATISFIED | Check linha 105-108: `approvalStatus !== 'APPROVED' → 403` com mensagem genérica "Reservas indisponíveis no momento." |
| DATA-04 | 17-04 | Rejeita slot com data no passado — backend + frontend | SATISFIED | Zod `.refine()` + `SLOT_DATE_PAST` no backend; `isStartsAtInPast()` + `validateForm()` no frontend |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `bookings.routes.ts` | 107 | `AppError('Reservas indisponíveis no momento.', 403)` sem código `TENANT_NOT_APPROVED` | Info | O PLAN 17-03 especificou a string `TENANT_NOT_APPROVED` como acceptance criteria interna, mas `AppError` só aceita `(message, statusCode)` — não há campo code. O comportamento externo (403 + mensagem genérica) está correto e DATA-02 é satisfeito. Desvio sem impacto funcional. |

Nenhum blocker ou warning encontrado.

### Human Verification Required

(nenhum item requer verificação humana — todos os critérios verificáveis programaticamente)

### Gaps Summary

Nenhum gap encontrado. Todos os 7 requisitos (SEC-01 a SEC-04, DATA-01, DATA-02, DATA-04) têm evidência concreta no codebase.

Uma divergência cosmética identificada: o PLAN 17-03 especificou que o código deveria conter a string `TENANT_NOT_APPROVED` como código de erro, mas a implementação usa a mensagem diretamente como `AppError('Reservas indisponíveis no momento.', 403)` — correto para a assinatura real de `AppError(message, statusCode)`. O comportamento observável (HTTP 403 com mensagem genérica) satisfaz integralmente DATA-02 e a decisão D-12 (mensagem deliberadamente genérica).

---

_Verified: 2026-06-22T09:50:00-03:00_
_Verifier: Claude (gsd-verifier)_
