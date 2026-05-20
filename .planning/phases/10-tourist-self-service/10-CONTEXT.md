# Phase 10: Tourist Self-Service - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Turista encontra e gerencia sua reserva usando apenas email + últimos 6 caracteres do booking ID — sem necessidade de criar conta ou fazer login.

Entrega: endpoint público de lookup, página `/[slug]/minha-reserva`, fluxo de cancelamento público, flow de reativação de pagamento expirado, e email de cancelamento.

**Fora de escopo:** autenticação de turista, histórico de múltiplas reservas, reembolso automático, gestão de operadora.

</domain>

<decisions>
## Implementation Decisions

### QR Code PIX — Armazenamento

- **D-01:** Adicionar campo `qrCode String?` ao model `Booking` no schema Prisma. Migration necessária. Capturar o valor retornado pelo Mercado Pago (`qrCode` string do PIX copia-e-cola) no `POST /tenants/:slug/bookings` e persistir junto com `paymentId`/`paymentUrl`.

### QR Code PIX — Comportamento por Status

- **D-02:** A página `/[slug]/minha-reserva` renderiza seções diferentes por `BookingStatus`:

  | Status | Comportamento |
  |--------|--------------|
  | `PENDING` | Exibir QR Code PIX + countdown do `expiresAt` + instrução de pagamento |
  | `CONFIRMED` | Ocultar seção de pagamento. Badge verde "Pagamento Aprovado". Detalhes do roteiro + ponto de encontro + horários. Botão WhatsApp direto para o guia/operadora. Botão "Baixar Voucher/Recibo". |
  | `EXPIRED` | Badge amarelo/laranja "Tempo esgotado". Botão "Gerar novo pagamento" — chama novo endpoint que invalida intenção anterior, cria novo PIX no MP, salva novo `qrCode`, volta status para `PENDING`. |
  | `CANCELLED` | Badge vermelho "Reserva Cancelada". Motivo se disponível. Contato de suporte (WhatsApp/email da operadora). Sem CTA de "pagar novamente". |

### Novos Endpoints de API (públicos, sem JWT)

- **D-03:** `POST /tenants/:slug/bookings/lookup`
  - Body: `{ email: string, code: string }` — `code` = últimos 6 chars do booking ID
  - Query no banco: `WHERE id LIKE '%{code}' AND tenantId = tenant.id`
  - Validar match de email após encontrar
  - Retornar dados safe (sem CPF hash, sem phone)
  - Erro genérico em caso de não encontrado ou email incorreto: `"Reserva não encontrada ou dados inválidos"` (nunca revelar qual campo falhou)

- **D-04:** `POST /tenants/:slug/bookings/cancel-self`
  - Body: `{ email: string, code: string }`
  - Validar email + 6-char code (mesmo padrão do lookup)
  - Cutoff: 24h antes do `slot.startsAt` — rejeitar com erro se dentro do prazo
  - Permitir apenas status `PENDING` ou `CONFIRMED`
  - Transação: `status → CANCELLED`, slot liberado (decrement `booked`), email de cancelamento disparado (fire-and-forget)

- **D-05:** `POST /tenants/:slug/bookings/repay`
  - Body: `{ email: string, code: string }`
  - Apenas para bookings com status `EXPIRED`
  - Chama MP API para gerar nova intenção de pagamento
  - Atualiza `paymentId`, `paymentUrl`, `qrCode`, `expiresAt` (nova janela), `status → PENDING`
  - Retorna novo booking com qrCode atualizado

### Cancelamento — UX

- **D-06:** Modal de confirmação na UI antes de cancelar ("Tem certeza? Esta ação não pode ser desfeita."). Após confirmação: chama `POST .../cancel-self`, recarrega estado da página com novo status `CANCELLED`.

- **D-07:** Email de cancelamento enviado ao turista após `cancel-self` — novo template texto simples, mesmo padrão dos outros emails (Resend, plain text, `from: 'CAPI <noreply@capi.turismo>'`). Conteúdo mínimo: nome do turista, roteiro, data, confirmação de cancelamento.

### Fluxo da UI

- **D-08:** Single-page com estados — uma única rota Next.js, URL não muda. Estados internos gerenciados por React state:
  - `LOOKUP`: Formulário com campos email + código (6 chars)
  - `LOADING`: Spinner durante chamada de API
  - `RESULT`: Card com seção baseada em status (D-02)
  - `ERROR`: Mensagem de erro inline (não reveladora)

- **D-09:** Layout visual: card único centralizado com seções. Estrutura:
  - Badge de status colorido no topo do card
  - Detalhes do roteiro (nome, data, guia, valor, pax)
  - Seção de pagamento (se PENDING: QR code + countdown; se EXPIRED: botão reativar)
  - Ações (cancelar, WhatsApp, voucher) conforme status
  - Mobile-first obrigatório: `100dvh`, `clamp()`, testar iOS Safari

### Segurança do Lookup

- **D-10:** Rate limiting dupla camada no endpoint `POST .../lookup` (e endpoints `cancel-self` e `repay`):
  1. **Global por IP:** ~20 req/min (mesmo padrão Phase 7)
  2. **Por email (keyGenerator):** 5 tentativas / 15 min por email. Chave: `lookup:email:{email.toLowerCase()}`. Erro 429 com mensagem opaca: `"Muitas tentativas para esta reserva. Tente novamente mais tarde."` — não informar quantas tentativas restam.

- **D-11:** Redis como store para o rate limiting. Primeira use real do Redis no projeto. Configurar `@fastify/rate-limit` com `ioredis` como store. `REDIS_URL` já disponível no Railway.

- **D-12:** Normalizar email em todos os endpoints públicos: `.trim().toLowerCase()` antes de buscar no banco e antes de gerar chave do rate limit.

- **D-13:** Erro opaco para lookup/cancel-self/repay em caso de falha de validação — nunca revelar se o email ou o código individualmente existem no sistema.

### Schema Changes

- **D-14:** Migration Prisma: adicionar `qrCode String?` ao model `Booking`. Atualizar `POST /bookings` para persistir o valor.

### Claude's Discretion

- Estrutura do componente React para a página (switch/early return por status — padrão já sugerido pelo usuário)
- Estilo visual do countdown do PIX (timer ou texto estático com data/hora)
- Mensagem exata de cada template (dentro do padrão plain text estabelecido)
- Implementação exata da query LIKE para busca por 6-char code

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos e Roadmap
- `.planning/REQUIREMENTS.md` §Self-service do Turista — TOURIST-01, TOURIST-02
- `.planning/ROADMAP.md` §Phase 10 — goal, success criteria, UI hint
- `.planning/PROJECT.md` — vision, constraints, deployment (Railway)

### Schema e Modelos
- `apps/api/prisma/schema.prisma` — model `Booking` (campos atuais, campo `qrCode` a adicionar), `BookingStatus` enum, model `DepartureSlot` (campo `startsAt` para cutoff de cancelamento)

### Endpoints Existentes a Referenciar
- `apps/api/src/modules/bookings/bookings.routes.ts` — `GET /tenants/:slug/bookings/:id` (padrão de lookup seguro com D-08 já implementado), `PATCH .../cancel` (lógica de cancelamento + slot release a replicar no endpoint público), `POST /bookings` (onde adicionar persistência do qrCode)

### Padrões de Email Estabelecidos (Phase 9)
- `apps/api/src/shared/email.ts` — função `getResend()` compartilhada
- `apps/api/src/modules/bookings/emails/` — templates existentes (bookingCreated, bookingConfirmed, bookingExpired) como referência de padrão para o novo email de cancelamento

### Segurança e Rate Limiting (Phase 7)
- `apps/api/src/app.ts` — configuração atual do `@fastify/rate-limit` (padrão a estender com Redis store e keyGenerator customizado)

### Frontend Existente
- `apps/web/src/components/ui/ConfirmationCard.tsx` — referência de card de booking existente
- `apps/web/src/components/ui/CheckoutClient.tsx` — padrão de página de booking client-side

### Decisões de Fases Anteriores
- Phase 7 CONTEXT (rate limiting): `apps/api` usa `@fastify/rate-limit`, throttle por IP já configurado
- Phase 9 CONTEXT: PIX QR code gerado pelo MP e enviado por email; `expiresAt` salvo no booking; padrão fire-and-forget para emails

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GET /tenants/:slug/bookings/:id?email=` — lógica de lookup seguro (email match + 404 genérico) já implementada; replicar padrão no novo endpoint com busca por 6-char suffix
- `PATCH /tenants/:slug/bookings/:id/cancel` — lógica completa de cancelamento transacional + slot release; adaptar para endpoint público sem JWT
- `apps/api/src/shared/email.ts` `getResend()` — reutilizar para email de cancelamento
- `ConfirmationCard.tsx` — card de booking com estrutura semelhante ao estado CONFIRMED da nova página
- `BookingStatus` enum já tem: PENDING, CONFIRMED, EXPIRED, CANCELLED

### Established Patterns
- Validação Zod em todas as rotas (Phase 7 standard)
- `AppError` para erros de domínio
- `prisma.$transaction` para operações de booking (anti-overbooking)
- Fire-and-forget para emails (`.catch(app.log.warn)`)
- `from: 'CAPI <noreply@capi.turismo>'` em todos os emails
- Mobile-first com `100dvh` e `clamp()` (memory: feedback_mobile_first)

### Integration Points
- `apps/api/src/app.ts` — registrar Redis store no rate-limit plugin
- `apps/api/src/modules/bookings/bookings.routes.ts` — adicionar 3 novos endpoints públicos + modificar POST para persistir qrCode
- `apps/api/prisma/schema.prisma` — migration para `qrCode String?`
- `apps/web/src/` — nova página `[slug]/minha-reserva/page.tsx` (Next.js App Router)
- Redis: `REDIS_URL` env var já no Railway, ioredis a instalar/usar

</code_context>

<specifics>
## Specific Ideas

- Usuário definiu pseudocódigo exato do switch por status para o componente React — implementar conforme padrão:
  ```tsx
  switch (booking.status) {
    case 'PENDING': return <PaymentSection qrCode={booking.qrCode} expiresAt={booking.expiresAt} />
    case 'CONFIRMED': return <ConfirmedSection bookingDetails={booking} supportLink={operator.whatsapp} />
    case 'EXPIRED': return <ExpiredSection onRetry={() => handleGenerateNewPix(booking.id)} />
    case 'CANCELLED': return <CancelledSection supportLink={company.support} />
    default: return <LoadingOrErrorState />
  }
  ```
- Rate limit keyGenerator exato definido pelo usuário:
  ```ts
  keyGenerator: (req) => `lookup:email:${(req.body.email || '').toLowerCase()}`
  ```
- Erro 429 opaco: `"Muitas tentativas para esta reserva. Tente novamente mais tarde."` — não informar tentativas restantes
- CONFIRMED: botão WhatsApp direto para o guia (número armazenado onde? — verificar se `Guide.whatsapp` ou `Tenant.whatsapp` existe no schema; se não, planner deve investigar)

</specifics>

<deferred>
## Deferred Ideas

- Reembolso automático via Mercado Pago quando turista cancela — v1.2 (requer integração com MP refund API)
- Motivo de cancelamento digitado pelo turista — v1.2
- Notificação ao guia quando turista cancela — v1.2
- Histórico de múltiplas reservas do mesmo email — v1.2 (fora do escopo TOURIST-01/02)
- Voucher PDF para download (mencionado no D-02 para CONFIRMED) — investigar se `Voucher` model já tem infra; planner deve avaliar se inclui na fase ou defere

</deferred>

---

*Phase: 10-tourist-self-service*
*Context gathered: 2026-05-20*
