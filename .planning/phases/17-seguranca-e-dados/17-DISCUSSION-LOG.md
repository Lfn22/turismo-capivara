# Phase 17: Segurança e Dados - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-18
**Phase:** 17-seguranca-e-dados
**Areas discussed:** Webhook dedup (SEC-04), Mensagem tenant PENDING (DATA-02), Cancel token: bookings existentes (SEC-02), DATA-04 frontend feedback

---

## Webhook dedup (SEC-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Tabela Prisma | ProcessedWebhookEvent com id + processedAt. Durável entre restarts, funciona no Railway sem infra extra. Requer migration + limpeza periódica. | ✓ |
| Em memória (Map/Set) | Set<string> no processo Fastify. Zero infra, mas limpa ao reiniciar. | |
| Claude decide | Escolher a abordagem mais segura para produção. | |

**User's choice:** Tabela Prisma
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| 24 horas | Cobre o período máximo de reenvio do MP. Limpeza diária remove registros antigos. | ✓ |
| 72 horas | Margem extra por segurança. | |
| Indefinido (nunca limpar) | Simples, sem job de limpeza. Tabela cresce para sempre. | |

**User's choice:** 24 horas
**Notes:** —

---

## Mensagem tenant PENDING (DATA-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Informativa | "Esta operadora ainda não foi aprovada para aceitar reservas. Tente novamente em breve." | |
| Opáca genérica | "Reservas indisponíveis no momento." | ✓ |
| Claude decide | Escolher a mensagem mais adequada para UX de MVP. | |

**User's choice:** Opaca genérica
**Notes:** Não expor o estado interno de aprovação ao turista.

| Option | Description | Selected |
|--------|-------------|----------|
| 403 no POST /bookings | API retorna 403 + mensagem genérica. Frontend exibe como erro no formulário. | ✓ |
| Bloquear antes do formulário | Página detecta tenant PENDING e oculta botão de reserva. Requer consulta extra. | |

**User's choice:** Retornar 403 no POST /bookings
**Notes:** —

---

## Cancel token: bookings existentes (SEC-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Gerar token na migration | Migration SQL gera UUID via gen_random_uuid() para cada booking existente. Todos operáveis imediatamente. | ✓ |
| Nullable, backfill lazy | Campo nullable. Bookings antigos ficam sem token — cancel-self retorna 404 para eles. | |
| Claude decide | Escolher a abordagem mais segura para o MVP. | |

**User's choice:** Gerar token na migration
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| No POST /bookings, na $transaction | crypto.randomBytes(32).toString('hex') gerado junto com criação do booking. Atômico, sempre presente. | ✓ |
| On-demand ao chamar cancel-self | Primeiro cancel-self gera e persiste o token. Mais complexo — pode criar race condition. | |

**User's choice:** No POST /bookings, na mesma $transaction
**Notes:** Token deve ser incluído no email de confirmação ao turista.

---

## DATA-04 frontend feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Erro inline no campo de data | Validação Zod no frontend + mensagem vermelha abaixo do input ao sair do campo. Feedback imediato. | ✓ |
| Toast após submit | Sem validação inline. API retorna 400, frontend exibe toast. | |
| Claude decide | Escolher a abordagem mais adequada para o painel. | |

**User's choice:** Erro inline no campo de data
**Notes:** onBlur + validação Zod cliente antes do submit. Mensagem: "A data do slot deve ser no futuro".

---

## Claude's Discretion

- Estratégia de limpeza da tabela `ProcessedWebhookEvent`
- Nome exato dos campos/índices no model Prisma

## Deferred Ideas

Nenhuma.
