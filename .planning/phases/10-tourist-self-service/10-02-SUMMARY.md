---
phase: 10
plan: "02"
subsystem: api/bookings
tags: [self-service, public-api, pix, cancellation, rate-limit]
dependency_graph:
  requires: [10-01]
  provides: [lookup-endpoint, cancel-self-endpoint, repay-endpoint]
  affects: [bookings.routes.ts, booking-cancelled-email.ts]
tech_stack:
  added: []
  patterns: [zod-safeParse-manual-validation, fire-and-forget-email, atomic-transaction-slot-release]
key_files:
  created:
    - apps/api/src/modules/bookings/emails/booking-cancelled-email.ts
    - apps/api/src/__tests__/self-service.test.ts
  modified:
    - apps/api/src/modules/bookings/bookings.routes.ts
decisions:
  - "Zod safeParse em handler (não schema.body) — projeto não usa type-provider-zod"
  - "Repay usa customerCpf='' pois CPF não é armazenado após hash — aceito para retry de pagamento"
  - "totalPrice removido do lookup response — campo não existe no schema Booking (preço vem de package.price)"
metrics:
  duration: "~20 minutos"
  completed: "2026-05-21"
  tasks_completed: 5
  files_created: 2
  files_modified: 1
---

# Phase 10 Plan 02: Public Self-Service API Endpoints Summary

**One-liner:** Três endpoints públicos sem JWT (lookup, cancel-self, repay) com rate-limit por email e validação Zod manual.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | selfServiceBodySchema em bookings.schemas.ts | 710fbbd (prior) |
| 2 | POST /lookup — consulta reserva por email+code | 2214c57 |
| 3 | POST /cancel-self — cancelamento com cutoff 24h + libera slot | 2214c57 |
| 4 | POST /repay — novo PIX para reservas EXPIRED | 2214c57 |
| 5 | booking-cancelled-email.ts + self-service.test.ts (11 testes) | 2214c57 + c08f8a0 |

## Endpoints Implemented

### POST /tenants/:slug/bookings/lookup
- Público (sem JWT)
- Rate limit: 5 req / 15min por email
- Retorna: id, status, customerName, pax, qrCode, paymentUrl, expiresAt, tenantWhatsapp, slot
- Erro opaco 404 para email errado ou booking não encontrado (D-13)

### POST /tenants/:slug/bookings/cancel-self
- Público (sem JWT)
- Cutoff: rejeita cancelamento se < 24h até partida (422)
- Rejeita status != PENDING ou CONFIRMED (422)
- Transação atômica: booking → CANCELLED + slot booked decrement
- Email de cancelamento fire-and-forget via Resend

### POST /tenants/:slug/bookings/repay
- Público (sem JWT)
- Só aceita bookings com status EXPIRED (422 caso contrário)
- Cria novo pagamento PIX via paymentService.createPixPayment
- Atualiza booking com novos campos de pagamento + reset para PENDING

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Schema Zod não compatível com Fastify schema.body**
- **Found during:** Task 2/3/4 (testes retornando 400)
- **Issue:** Fastify 5 sem type-provider-zod rejeita Zod object no schema.body com "schema is invalid: data/required must be array"
- **Fix:** Removido `schema: { body }` dos 3 endpoints; validação manual com `selfServiceBodySchema.safeParse(request.body)` em cada handler
- **Files modified:** bookings.routes.ts
- **Commit:** 2214c57

**2. [Rule 1 - Bug] totalPrice não existe no schema Booking**
- **Found during:** TypeScript check
- **Issue:** `booking.totalPrice` referenciado mas campo não existe no modelo Prisma; preço está em `slot.package.price`
- **Fix:** Removido `totalPrice` da resposta do /lookup; repay calcula `Number(booking.slot.package.price) * booking.pax`
- **Files modified:** bookings.routes.ts
- **Commit:** 2214c57

**3. [Rule 1 - Bug] CreatePixPaymentInput com campos errados no repay**
- **Found during:** TypeScript check
- **Issue:** Repay usava `tenantSlug`, `customerName`, `amount` mas interface exige `slug`, `transactionAmount`, `description`, `customerCpf`
- **Fix:** Alinhado com interface real; `customerCpf: ''` pois CPF não é armazenado após hash
- **Files modified:** bookings.routes.ts
- **Commit:** 2214c57

**4. [Rule 1 - Bug] Zod v4 usa .issues não .errors**
- **Found during:** TypeScript check após fix do safeParse
- **Issue:** `parsed.error.errors` não existe no Zod v4 — propriedade é `issues`
- **Fix:** replace_all de `.errors[0]` → `.issues[0]`
- **Files modified:** bookings.routes.ts
- **Commit:** 2214c57

**5. [Rule 1 - Bug] Testes com code de 4 chars falhavam validação Zod (length=6)**
- **Found during:** Task 5 (testes retornando 400)
- **Issue:** Schema exige code com exatamente 6 chars; testes usavam '1234' (4 chars)
- **Fix:** Atualizado para 'ab1234' e 'zz9999' nos testes
- **Files modified:** self-service.test.ts
- **Commit:** c08f8a0

## Test Results

- 43/43 testes passando (8 suites)
- 11 novos testes em self-service.test.ts
- TypeScript sem erros

## Known Stubs

Nenhum.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: enumeration | bookings.routes.ts | Lookup e cancel-self usam `id: { endsWith: code }` — busca por sufixo de ID pode ser enumerável se código curto. Rate limit mitiga mas não elimina. |

## Self-Check: PASSED

- `apps/api/src/modules/bookings/emails/booking-cancelled-email.ts` — EXISTS
- `apps/api/src/__tests__/self-service.test.ts` — EXISTS
- Commit 2214c57 — EXISTS (`git log --oneline | grep 2214c57`)
- Commit c08f8a0 — EXISTS
- 43 testes passando — VERIFIED
