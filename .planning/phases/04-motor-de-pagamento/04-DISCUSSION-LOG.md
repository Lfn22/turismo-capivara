# Phase 4: Motor de Pagamento - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-30
**Phase:** 04-motor-de-pagamento
**Areas discussed:** Fallback MP indisponível, Validade do link PIX, Validação do webhook

---

## Fallback MP indisponível

| Option | Description | Selected |
|--------|-------------|----------|
| Rollback total | Booking não criado, turista recebe 502. Sem estado inconsistente. | |
| Cria booking sem URL | Booking fica PENDING com payment_url = null, endpoint para regenerar depois | |
| Retry automático | 2-3 tentativas com backoff antes de falhar | ✓ |

**User's choice:** Retry automático — e se todos os retries falharem, rollback total (booking não criado).

---

## Validade do link PIX

### Duração do link

| Option | Description | Selected |
|--------|-------------|----------|
| 30 minutos | Padrão do mercado brasileiro | |
| 24 horas | Mais flexível para o turista | ✓ |
| Sem expiração definida | Deixar o gateway controlar | |

**User's choice:** 24 horas.

### O que acontece ao expirar

| Option | Description | Selected |
|--------|-------------|----------|
| Booking vira EXPIRED, slot liberado | Status EXPIRED no enum, webhook payment.cancelled dispara | ✓ |
| Booking fica PENDING indefinidamente | Admin cancela manualmente | |

**User's choice:** Booking vira EXPIRED e slot é liberado automaticamente via webhook.

---

## Validação do webhook

### Mecanismo de assinatura

| Option | Description | Selected |
|--------|-------------|----------|
| x-signature header | Novo (2024+), HMAC-SHA256, recomendado pelo MP | ✓ |
| access_token query param | Legado, sendo depreciado | |

**User's choice:** x-signature header.

### Ambiente de testes local

| Option | Description | Selected |
|--------|-------------|----------|
| ngrok + MP Sandbox | Fluxo real end-to-end sem deploy | ✓ |
| Testes unitários mockados | Rápido mas sem integração real | |
| Só testar em staging/Railway | Ciclo mais lento | |

**User's choice:** ngrok + MP Sandbox.

---

## Claude's Discretion

- Estrutura do módulo de pagamento (modules/payments/ vs estender bookings/)
- Implementação dos retries (biblioteca vs manual)
- Formato exato do payload de retorno do POST /bookings

## Deferred Ideas

- PAY-02 (cartão de crédito) — defer para fase posterior
- PAY-03 (repasse automático ao guia) — pós-MVP
- BOOK-03 (política de reembolso) — pós-MVP
