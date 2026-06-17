---
phase: 16-integridade-de-pagamento
verified: 2026-06-17T00:00:00Z
status: gaps_found
score: 6/8 must-haves verified
overrides_applied: 0
gaps:
  - truth: "CheckoutClient faz polling a cada 5000ms e para automaticamente ao detectar status CONFIRMED, CANCELLED ou EXPIRED"
    status: partial
    reason: "O intervalo de 5000ms e o clearInterval nos terminais estão corretos, mas fetchBooking usa exclusivamente a rota /api/[slug]/bookings/[id]/status que retorna apenas { status }. O componente faz setBooking(data) com esse objeto, então booking.qrCode, booking.expiresAt, booking.pax e booking.slot ficam undefined após toda poll. A seção PIX nunca renderiza (condicional `booking.qrCode`), o countdown não inicia, e o resumo da reserva fica em branco. O polling para no status correto mas o componente não exibe dados úteis ao turista."
    artifacts:
      - path: "apps/web/src/components/ui/CheckoutClient.tsx"
        issue: "fetchBooking usa /status (retorna apenas { status }) para o fetch inicial E as polls. setBooking(data) popula o estado com apenas { status }, deixando todos os outros campos undefined."
      - path: "apps/web/app/api/[slug]/bookings/[id]/status/route.ts"
        issue: "Retorna apenas { status: data.status } — correto para polling de status, mas CheckoutClient depende dos dados completos do booking para renderizar QR code, countdown e resumo."
    missing:
      - "Fetch inicial em CheckoutClient deve usar rota que retorna booking completo (qrCode, pax, expiresAt, slot). A rota /api/[slug]/bookings/route.ts GET ou a rota /api/[slug]/bookings/[id]/status devem retornar dados completos no load inicial."
      - "Opção A: Fazer fetch inicial via /tenants/[slug]/bookings/[id]?email=... direto na API (padrão já existente na rota lookup) e polls subsequentes via /status."
      - "Opção B: Ampliar /status para retornar o booking completo (ou um subset seguro com qrCode, expiresAt, pax, slot) — renomear endpoint ou criar /api/[slug]/bookings/[id]/route.ts."
  - truth: "GET /api/[slug]/bookings/[id]/status retorna { status } do booking"
    status: partial
    reason: "A rota existe e retorna { status: data.status } conforme especificado. O problema é que o CheckoutClient depende de campos adicionais (qrCode, pax, expiresAt, slot) que não são retornados por esta rota, e usa essa mesma rota tanto para o fetch inicial quanto para polls. A rota em si está correta, mas está sub-especificada para o caso de uso do componente."
    artifacts:
      - path: "apps/web/app/api/[slug]/bookings/[id]/status/route.ts"
        issue: "Rota retorna apenas { status } mas CheckoutClient precisa de mais campos no fetch inicial."
    missing:
      - "Criar rota GET /api/[slug]/bookings/[id]/route.ts que retorne o booking completo para o fetch inicial, ou modificar o CheckoutClient para usar a rota de lookup no carregamento inicial e /status apenas nas polls subsequentes."
---

# Phase 16: Integridade de Pagamento — Verification Report

**Phase Goal:** Garantir integridade de pagamento — produção nunca serve mock, booking nunca existe sem PIX válido, CPF inválido rejeitado na entrada (backend e frontend), polling de status em tempo real.
**Verified:** 2026-06-17
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Em produção sem MP_ACCESS_TOKEN, a API retorna 503 com mensagem amigável — nunca retorna mock silencioso | VERIFIED | `payment.service.ts` linhas 31-33: `if (!token) { if (process.env.NODE_ENV === 'production') { throw new AppError('Serviço de pagamento temporariamente indisponível', 503) }` |
| 2 | Se createPixPayment falhar após retries, nenhum booking é criado no banco | VERIFIED | `bookings.routes.ts` linhas 197-219: `createPixPayment` é chamado antes do `booking.create`; catch restaura slot via tx separada e re-lança o erro sem criar booking |
| 3 | O booking criado no banco já contém paymentId e qrCode no momento do INSERT | VERIFIED | `bookings.routes.ts` linhas 222-240: `tx.booking.create` com `paymentId: paymentResult.paymentId`, `qrCode: paymentResult.qrCode`, `paymentUrl: paymentResult.paymentUrl` no mesmo create |
| 4 | CPF 11111111111 é rejeitado com mensagem 'CPF inválido' antes de qualquer operação no banco | VERIFIED | `bookings.routes.ts` linha 48-50: schema com `.refine(isValidCPF, { message: 'CPF inválido' })`; `isValidCPF` linhas 16-41 rejeita `/^(\d)\1{10}$/` |
| 5 | CPF 12345678909 (válido) é aceito pelo backend | VERIFIED | Algoritmo de dígitos verificadores correto em `isValidCPF` (linhas 16-41) — 12345678909 passa os dois dígitos verificadores |
| 6 | Duas requisições simultâneas no mesmo slot com capacidade 1 resultam em apenas 1 booking criado | VERIFIED | `bookings.routes.ts` linhas 130-170: Tx 1 faz `SELECT ... FOR UPDATE` dentro de `tx.$queryRaw` (linha 132), seguido de check de capacidade e increment — lock pessimista correto |
| 7 | GET /api/[slug]/bookings/[id]/status retorna { status } do booking | PARTIAL | Rota existe (`apps/web/app/api/[slug]/bookings/[id]/status/route.ts`) e retorna `{ status: data.status }`. Porém o CheckoutClient usa esta mesma rota para o fetch inicial, tornando booking.qrCode, booking.pax, booking.expiresAt e booking.slot sempre undefined |
| 8 | CheckoutClient faz polling a cada 5000ms e para automaticamente ao detectar status CONFIRMED, CANCELLED ou EXPIRED | PARTIAL | Intervalo de 5000ms correto (linha 102). clearInterval nos três terminais correto (linha 101). Mas fetchBooking popula `booking` com apenas `{ status }`, portanto a UI nunca exibe QR code, countdown ou resumo da reserva — componente é funcionalmente vazio |

**Score:** 6/8 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/services/payment.service.ts` | Guard NODE_ENV === production sem token | VERIFIED | Guard na linha 32, lança AppError 503 |
| `apps/api/src/modules/bookings/bookings.routes.ts` | isValidCPF + .refine() + SELECT FOR UPDATE na tx | VERIFIED | isValidCPF linhas 16-41, refine linha 50, FOR UPDATE linha 144 |
| `apps/web/app/api/[slug]/bookings/[id]/status/route.ts` | Proxy Next.js retornando { status } | EXISTS / HOLLOW | Arquivo existe e retorna { status }, mas CheckoutClient nunca exibe dados do booking porque usa esta rota para tudo |
| `apps/web/src/components/ui/BookingForm.tsx` | Validação CPF inline no campo antes do submit | VERIFIED | isValidCPF definida linha 6-19, cpfError state linha 47, onBlur linhas 178-185, erro exibido linhas 195-197, submit bloqueado linha 59 |
| `apps/web/src/components/ui/CheckoutClient.tsx` | Polling 5000ms com clearInterval em terminais | PARTIAL / WIRED | Polling e clearInterval corretos, mas fetchBooking retorna apenas { status } para setBooking — todos os campos de UI ficam undefined |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `payment.service.ts → attemptCreatePayment` | `process.env.NODE_ENV + process.env.MP_ACCESS_TOKEN` | guard condicional antes do mock | WIRED | Linhas 27-42: token lido, guard if NODE_ENV=production lança 503 |
| `createBookingBodySchema → customerCpf` | `isValidCPF()` | `.refine(isValidCPF, 'CPF inválido')` | WIRED | Linha 50: `.refine(isValidCPF, { message: 'CPF inválido' })` |
| `prisma.$transaction` | `DepartureSlot FOR UPDATE` | `tx.$queryRaw` | WIRED | Linha 132: `tx.$queryRaw` (prefixo tx, dentro da primeira $transaction) |
| `CheckoutClient.tsx → polling useEffect` | `/api/[slug]/bookings/[id]/status` | fetch no setInterval | WIRED (URL) / HOLLOW (dados) | URL correta linha 74, mas rota retorna apenas { status } — setBooking recebe objeto sem qrCode/pax/expiresAt/slot |
| `BookingForm.tsx → campo CPF` | `isValidCPF()` | `onBlur` handler | WIRED | Linha 178-185: onBlur chama isValidCPF, seta cpfError |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `CheckoutClient.tsx` | `booking` (qrCode, pax, expiresAt, slot) | `/api/[slug]/bookings/[id]/status` via fetchBooking | Não — retorna apenas { status } | HOLLOW — wired mas dados desconectados |
| `BookingForm.tsx` | `cpfError` | onBlur → isValidCPF() | Sim — computed localmente | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED para arquivos de componente React (sem entry points executáveis sem servidor).

Verificações lógicas realizadas por inspeção de código:

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| NODE_ENV=production + sem token → 503 | Guard em payment.service.ts linha 32 | `if (process.env.NODE_ENV === 'production') throw AppError 503` | PASS |
| booking.create só após createPixPayment | Ordem no handler POST | createPixPayment linha 199, booking.create linha 223 — ordem correta | PASS |
| CPF 11111111111 rejeitado por isValidCPF | `/^(\d)\1{10}$/` regex linha 18 | Regex captura 11111111111 → return false | PASS |
| CheckoutClient exibe QR code ao usuário | `booking.qrCode` condicional linha 286 | booking populado com apenas { status } → qrCode undefined → seção PIX nunca renderiza | FAIL |

---

### Requirements Coverage

| Requirement | Fonte | Descrição | Status | Evidência |
|-------------|-------|-----------|--------|-----------|
| PAY-01 | 16-01 | 503 em produção sem MP_ACCESS_TOKEN | SATISFIED | payment.service.ts linhas 31-33 |
| PAY-02 | 16-01 | PIX antes do booking INSERT | SATISFIED | bookings.routes.ts: createPixPayment linha 199, booking.create linha 223 |
| PAY-03 | 16-03 | Polling a cada 5s sem reload | PARTIAL | Polling implementado (5000ms, clearInterval em terminais), mas UI não exibe dados do booking — turista vê resumo vazio, sem QR code, sem countdown |
| PAY-04 | 16-02, 16-03 | CPF com dígitos verificadores inválidos rejeitado | SATISFIED | Backend: refine linha 50; Frontend: onBlur linhas 178-185 |
| DATA-03 | 16-02 | Lock pessimista SELECT FOR UPDATE | SATISFIED | bookings.routes.ts linha 144, dentro de tx.$queryRaw na primeira transação |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `CheckoutClient.tsx` | 78 | `const data: Booking = await res.json()` com type cast — mas rota retorna `{ status }`, não `Booking` completo | Blocker | TypeScript compila sem erro (type cast) mas dados ausentes causam UI vazia em runtime |
| `CheckoutClient.tsx` | 79 | `setBooking(data)` onde data tem apenas { status } | Blocker | booking.qrCode, booking.pax, booking.expiresAt, booking.slot ficam undefined — checkout não exibe nada útil |

---

### Human Verification Required

Nenhuma — todos os itens pendentes são verificáveis por inspeção de código ou foram identificados como gaps concretos acima.

---

### Gaps Summary

**1 gap raiz, manifestado em 2 truths:**

O `CheckoutClient.tsx` usa a mesma função `fetchBooking` tanto para o carregamento inicial quanto para todas as polls. Esta função chama `/api/[slug]/bookings/[id]/status?email=...`, que retorna corretamente apenas `{ status }` para minimizar exposição de dados durante polling. O problema é que `setBooking(data)` popula o estado com `{ status: "PENDING" }` — todos os outros campos (`qrCode`, `pax`, `expiresAt`, `slot`) ficam `undefined`.

Consequências em runtime:
- Seção PIX nunca renderiza (condicional `isPending && !isExpired && booking.qrCode` — `booking.qrCode` é undefined)
- Countdown nunca inicia (`useCountdown(booking?.expiresAt ?? null)` recebe `null`)
- Resumo da reserva exibe "Roteiro" como nome do pacote e omite data e número de pessoas

A fix mais simples: fazer o fetch inicial via a rota da API diretamente (ou via `/api/[slug]/bookings/[id]` que retorne o booking completo) para popular o estado inicial, e usar `/status` apenas nas polls subsequentes para verificar mudança de status.

---

_Verified: 2026-06-17_
_Verifier: Claude (gsd-verifier)_
