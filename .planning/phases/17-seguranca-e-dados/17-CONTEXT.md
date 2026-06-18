# Phase 17: Segurança e Dados - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Resistência a abuso no cancel-self (rate limit + token opaco), isolamento multi-tenant em confirm/cancel, deduplicação de webhook do Mercado Pago, e integridade de dados de slot em todos os cenários de cancelamento e criação.

**In scope:** SEC-01, SEC-02, SEC-03, SEC-04, DATA-01, DATA-02, DATA-04
**Out of scope:** UX do checkout (Phase 18), confiabilidade operacional (Phase 19), polimento (Phase 20)

</domain>

<decisions>
## Implementation Decisions

### SEC-01 — Rate limit cancel-self
- **D-01:** 3 tentativas por 15 minutos por IP → 4ª retorna 429. Usar `@fastify/rate-limit` com config específica para a rota (não o rate limit global).
- **D-02:** Escopo do rate limit: por IP independente de tenant (global no endpoint cancel-self).

### SEC-02 — Token opaco no cancel-self
- **D-03:** `cancelToken` é um novo campo `String @unique` no model `Booking` do schema Prisma. Requer migration.
- **D-04:** Geração: `crypto.randomBytes(32).toString('hex')` no `POST /bookings`, dentro da mesma `$transaction` de criação do booking. Sempre presente em novos bookings.
- **D-05:** Bookings existentes sem token: migration SQL gera UUID aleatório via `gen_random_uuid()` para todos os registros existentes. Todos os bookings ficam operáveis no cancel-self após a migration.
- **D-06:** O `cancelToken` deve ser incluído no email de confirmação ao turista (link/código de cancel-self).

### SEC-03 — Isolamento multi-tenant
- **D-07:** Handlers de `PATCH /bookings/:id/confirm` e `PATCH /bookings/:id/cancel` verificam que `booking.tenantId === tenant.id` (tenant do JWT). Retornar `AppError('Acesso negado', 403)` se divergir. (Verificação já existe em alguns handlers — auditar e garantir consistência em todos.)

### SEC-04 — Deduplicação de webhook
- **D-08:** Persistir IDs de webhooks processados em nova tabela Prisma `ProcessedWebhookEvent` com campos: `id` (ID do evento MP), `processedAt` (DateTime).
- **D-09:** Janela de dedup: 24 horas. Webhook com mesmo ID dentro de 24h é ignorado (retornar 200 silenciosamente).
- **D-10:** Limpeza: job ou query de `deleteMany` remove registros com `processedAt < now - 24h`. Pode ser executado na própria rota de webhook ou via cron leve.

### DATA-01 — Liberação de capacidade no cancelamento
- **D-11:** `PATCH /bookings/:id/cancel` deve decrementar `bookedCount` do slot via `$transaction` atômica, junto com a mudança de status para `CANCELLED`. Não decrementar se o booking já estava CANCELLED.

### DATA-02 — Bloquear booking em tenant PENDING
- **D-12:** `POST /bookings` verifica `tenant.approvalStatus === 'APPROVED'` antes de prosseguir. Se não aprovado, retorna 403 com mensagem genérica: `"Reservas indisponíveis no momento."`.
- **D-13:** Sem bloqueio no frontend antes do formulário — o erro aparece apenas ao submeter o booking (frontend exibe o erro da API).

### DATA-04 — Rejeitar slot com data no passado
- **D-14:** Backend: validação Zod no schema do POST/PUT de slots — `date: z.date().min(new Date(), { message: 'Data deve ser no futuro' })`.
- **D-15:** Frontend (painel do guia): erro inline abaixo do campo de data ao sair do campo (`onBlur`) + validação Zod no cliente antes do submit. Mensagem: `"A data do slot deve ser no futuro"`.

### Claude's Discretion
- Estratégia de limpeza da tabela `ProcessedWebhookEvent` — pode ser query simples no próprio handler de webhook (antes da inserção) ou via cron separado. Escolher o mais simples.
- Nome exato dos campos/índices na tabela `ProcessedWebhookEvent`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos
- `.planning/REQUIREMENTS.md` §SEC-01, SEC-02, SEC-03, SEC-04, DATA-01, DATA-02, DATA-04 — Requisitos com critérios de aceitação

### Roadmap
- `.planning/ROADMAP.md` §Phase 17 — Goal, success criteria, UAT checklist

### Código existente crítico
- `apps/api/src/modules/bookings/bookings.routes.ts` — Rota cancel-self (linha 366), handlers de confirm/cancel, $transaction existente
- `apps/api/src/modules/webhooks/webhooks.routes.ts` — Handler atual de webhook MP (sem dedup ainda)
- `apps/api/prisma/schema.prisma` — Schema atual (model Booking sem cancelToken, sem ProcessedWebhookEvent)
- `apps/api/src/__tests__/rate-limit.test.ts` — Testes existentes de rate limit (referência de padrão)
- `apps/api/src/__tests__/self-service.test.ts` — Testes existentes de cancel-self

### Decisões técnicas ativas (STATE.md)
- Rate limiting: `@fastify/rate-limit` global via `fastify.register` — webhook MP isento via `config: { rateLimit: false }`
- Prisma: usar `prisma.$transaction` para bookings
- JWT strategy: `fastify.authenticate` decorator
- Tenant lookup: sempre via `tenantSlug` no path param

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AppError(message, statusCode)` — usar para 403, 429, 400 em todos os novos handlers
- `fastify.authenticate` decorator — já configurado para verificação de JWT
- `prisma.$transaction` — padrão estabelecido no POST /bookings (anti-overbooking)
- `@fastify/rate-limit` — já registrado globalmente; suporta `config: { rateLimit: { max, timeWindow } }` por rota

### Established Patterns
- Tenant isolation: `where: { id, tenantId: tenant.id }` em Prisma queries — padrão existente
- Error responses: `throw new AppError('Acesso negado', 403)` — padrão do projeto
- Status change: `data: { status: 'CANCELLED' }` já existe — só falta o decremento de `bookedCount`

### Integration Points
- `ProcessedWebhookEvent` table conecta ao handler em `webhooks.routes.ts`
- `Booking.cancelToken` conecta ao handler de cancel-self e ao serviço de email (Phase 9/NOTIF)
- Validação de slot date conecta ao endpoint de criação de slots (pacotes/packages)

</code_context>

<specifics>
## Specific Ideas

- O cancelToken deve ir no email de confirmação ao turista — integração com o fluxo de email já existente (Phase 9).
- Mensagem DATA-02 intencionalmente genérica: "Reservas indisponíveis no momento." — não expõe o estado de aprovação da operadora ao turista.

</specifics>

<deferred>
## Deferred Ideas

Nenhuma — discussão ficou dentro do escopo da fase.

</deferred>

---

*Phase: 17-seguranca-e-dados*
*Context gathered: 2026-06-18*
