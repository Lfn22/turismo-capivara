---
phase: 17-seguranca-e-dados
plan: "02"
subsystem: bookings
tags: [security, rate-limit, cancel-token, SEC-01, SEC-02]
dependency_graph:
  requires: ["17-01"]
  provides: ["cancelToken-lookup", "IP-rate-limit-cancel-self"]
  affects: ["bookings.routes.ts", "bookings.schemas.ts", "booking-created-email.ts"]
tech_stack:
  added: []
  patterns: ["IP-based rate limiting", "opaque token lookup"]
key_files:
  created:
    - apps/api/src/__tests__/cancel-self.test.ts
  modified:
    - apps/api/src/modules/bookings/bookings.routes.ts
    - apps/api/src/modules/bookings/bookings.schemas.ts
    - apps/api/src/modules/bookings/emails/booking-created-email.ts
    - apps/api/src/modules/bookings/emails/booking-created-email.test.ts
    - apps/api/src/__tests__/self-service.test.ts
decisions:
  - "cancel-self usa { token } no body (POST) — não mudou para GET/query-param (cirúrgico)"
  - "repay e lookup mantêm { email, code } — fora do escopo do plano"
  - "falhas em bookings-create.test.ts e repay são pré-existentes (confirmado via git stash)"
metrics:
  duration: "~15 min"
  completed: "2026-06-18"
  tasks: 3
  files: 6
---

# Phase 17 Plan 02: cancel-self — Rate Limit IP + cancelToken opaco

**Status:** Complete

**One-liner:** Rate limit do cancel-self migrado de keyed-por-email para IP (max 3/15min), e lookup substituído de `id.endsWith` para `cancelToken` opaco de 64 chars hex.

## Tasks Completed

1. **Task 1: Corrigir rate limit (IP-based) e lookup por cancelToken**
   - `keyGenerator: (req) => req.ip`, `max: 3`, `timeWindow: '15 minutes'`
   - lookup: `prisma.booking.findFirst({ where: { cancelToken: token, tenantId: tenant.id } })`
   - schema novo: `cancelSelfBodySchema` com campo `token`

2. **Task 2: Gerar cancelToken no POST /bookings**
   - `randomBytes(32).toString('hex')` dentro do `$transaction` no `prisma.booking.create`
   - email de confirmação agora inclui link de cancelamento: `https://{slug}.capi.com.br/minha-reserva/cancelar?token={cancelToken}`

3. **Task 3: Testes**
   - `cancel-self.test.ts` criado com 4 testes: bloqueio na 4a tentativa, isolamento por IP, 404 para token inexistente, 400 para body sem token

## Files Modified

- `apps/api/src/modules/bookings/bookings.routes.ts`
- `apps/api/src/modules/bookings/bookings.schemas.ts`
- `apps/api/src/modules/bookings/emails/booking-created-email.ts`
- `apps/api/src/modules/bookings/emails/booking-created-email.test.ts`
- `apps/api/src/__tests__/self-service.test.ts`
- `apps/api/src/__tests__/cancel-self.test.ts` (criado)

## Commits

- `db53c37`: feat(17-02): cancelToken opaco no cancel-self — IP rate limit + lookup por token
- `5846ddd`: test(17-02): testes de rate limit IP e cancelToken opaco no cancel-self

## Deviations

**1. [Rule 2 - Schema] Novo schema cancelSelfBodySchema em vez de reutilizar selfServiceBodySchema**
- cancel-self agora aceita `{ token }` enquanto lookup/repay mantêm `{ email, code }`
- Criado `cancelSelfBodySchema` separado para não quebrar as outras rotas

**2. [Atualização de testes existentes] self-service.test.ts e booking-created-email.test.ts**
- cancel-self mudou de `{ email, code }` para `{ token }` — testes existentes atualizados para o novo contrato
- Teste "returns 404 for email mismatch" substituído por "returns 404 when token does not match" (lógica equivalente no novo modelo)

**Falhas pré-existentes (não causadas por este plano):**
- `bookings-create.test.ts` (5 testes) — falham antes e depois das mudanças (confirmado via git stash)
- `self-service.test.ts > repay > happy path` (1 teste) — falha pré-existente
- `uploads.routes.test.ts` (4 testes) — não relacionados a este plano

## Next Phase Readiness

Ready for Wave 3 (17-03) — webhook deduplication.

## Self-Check: PASSED

- `apps/api/src/__tests__/cancel-self.test.ts` existe
- `db53c37` existe em `git log`
- `5846ddd` existe em `git log`
- TypeScript compila sem erros (`tsc --noEmit`)
- 4/4 testes de cancel-self passam
