# Phase 4: Motor de Pagamento - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrar o Mercado Pago ao fluxo de reserva existente: ao criar um booking, gerar um link de pagamento PIX e retorná-lo ao turista. Um webhook do MP confirma o pagamento automaticamente, transicionando o booking para CONFIRMED. Links expirados transitam o booking para EXPIRED e liberam o slot.

A trava transacional anti-overbooking (POST /bookings) já existe e não será reescrita — apenas estendida para chamar o MP após a criação do booking.

</domain>

<decisions>
## Implementation Decisions

### Fallback quando Mercado Pago está indisponível

- **D-01:** Retry automático com backoff antes de falhar — a chamada ao MP deve ser tentada 2-3 vezes com backoff exponencial antes de desistir.
- **D-02:** Se todos os retries falharem, rollback total — booking não é criado, turista recebe 502. Sem booking órfão com payment_url = null. O `$transaction` do Prisma deve englobar tanto a criação do booking quanto a verificação do resultado do MP (ou a chamada deve ser feita fora da transaction, com compensação manual em caso de falha).

### Validade do link PIX

- **D-03:** Link de pagamento tem validade de 24 horas — configurar `date_of_expiration` na preference do MP com `+24h` a partir da criação.
- **D-04:** Quando o link expira sem pagamento, o booking transiciona para `EXPIRED` e o slot é liberado — adicionar `EXPIRED` ao enum `BookingStatus` no schema Prisma. O webhook `payment.cancelled` (ou `payment.expired`) do MP dispara essa transição automaticamente. A liberação do slot (decrement em `booked`, status de volta a `OPEN`) deve ocorrer dentro de `$transaction`.

### Schema — campos novos no Booking

- **D-05:** Adicionar ao model `Booking`:
  - `paymentId: String?` — ID externo da preference/pagamento no Mercado Pago
  - `paymentUrl: String?` — link de pagamento retornado ao turista
  - `expiresAt: DateTime?` — timestamp de expiração do link (now + 24h)

### Validação do webhook

- **D-06:** Usar `x-signature` header (mecanismo novo do MP, 2024+) — HMAC-SHA256 com `ts` (timestamp) + `data.id` do payload. Rejeitar requests sem header ou com assinatura inválida com 400.
- **D-07:** Variável de ambiente `MP_WEBHOOK_SECRET` obrigatória no Railway para validação da assinatura.
- **D-08:** Idempotência — antes de transicionar booking, verificar se já está CONFIRMED/EXPIRED. Se sim, retornar 200 sem reprocessar (evita dupla confirmação em retentativas do MP).

### Ambiente de desenvolvimento / testes

- **D-09:** Testar localmente via ngrok + MP Sandbox — expor porta 3333 via ngrok e configurar a URL no painel do Mercado Pago Sandbox. Sem necessidade de deploy para validar o fluxo end-to-end.
- **D-10:** Variáveis para Sandbox: `MP_ACCESS_TOKEN` (token do Sandbox), `MP_WEBHOOK_SECRET` — separadas das de produção no Railway.

### Claude's Discretion

- Estrutura do módulo de pagamento: Claude decide se criar `modules/payments/` separado ou estender `modules/bookings/`
- Formato exato do payload de retorno do POST /bookings (quais campos além de `payment_url`)
- Implementação dos retries: biblioteca (p-retry, custom) ou implementação manual

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Código existente
- `apps/api/src/modules/bookings/bookings.routes.ts` — POST /bookings com $transaction anti-overbooking; PATCH confirm/cancel
- `apps/api/prisma/schema.prisma` — model Booking (sem campos de pagamento ainda), enum BookingStatus
- `apps/api/src/shared/errors/AppError.ts` — padrão de erros de negócio

### Requirements
- `.planning/REQUIREMENTS.md` §Payments — PAY-01 (PIX), PAY-02 (cartão — deferred desta fase), PAY-03 (repasse — deferred)
- `.planning/REQUIREMENTS.md` §Bookings — BOOK-01, BOOK-02

### Prior decisions
- `.planning/phases/01-security-hardening/01-CONTEXT.md` — Zod validation pattern, AppError, error response format
- `.planning/phases/03-roteiros-e-disponibilidade/03-CONTEXT.md` — $transaction ownership pattern, slot status lifecycle

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `authenticate` + `authorize` middlewares — padrão já estabelecido para proteção de rotas
- `AppError` — usar para erros de negócio no handler do webhook
- `parseParams` helper — reutilizar para validação de params do webhook se necessário
- `$transaction` pattern — estender o existente em POST /bookings, não reescrever

### Established Patterns
- Zod v4: `err.issues.map()` (não `.errors`) — todos os catch blocks usam esse padrão
- Error 400: `{ message: 'Dados inválidos', errors: [{field, message}] }` em português
- Rotas escopadas por tenant: `/tenants/:slug/resource` — o webhook do MP **não segue esse padrão** (é global, sem slug)
- Status transitions: sempre dentro de `$transaction` para consistência com slot

### Integration Points
- `POST /tenants/:slug/bookings` — ponto de extensão principal; após criação do booking, chamar MP
- Novo: `POST /webhooks/mercadopago` — rota global (sem tenant prefix), sem auth JWT, com validação x-signature
- `enum BookingStatus` no schema Prisma — adicionar `EXPIRED`
- `model Booking` — adicionar `paymentId`, `paymentUrl`, `expiresAt`

</code_context>

<specifics>
## Specific Ideas

- O webhook é uma rota global (`/webhooks/mercadopago`), não escopada por tenant — isso é diferente do padrão do resto da API. O planner deve considerar isso na organização do módulo.
- A chamada ao MP deve acontecer **depois** que o `$transaction` do Prisma commitar com sucesso — não dentro da transaction, para evitar que uma falha do MP cause rollback do booking criado. A compensação (deletar booking se MP falhar após retries) deve ser explícita.

</specifics>

<deferred>
## Deferred Ideas

- **PAY-02 (cartão de crédito)** — requirement existe mas o ROADMAP desta fase descreve apenas PIX. Defer para Phase 4.1 ou Phase 5.
- **PAY-03 (repasse automático ao guia)** — split payment após confirmação. Defer pós-MVP.
- **BOOK-03 (política de reembolso)** — cancelamento com reembolso via MP. Defer pós-MVP.

</deferred>

---

*Phase: 04-motor-de-pagamento*
*Context gathered: 2026-04-30*
