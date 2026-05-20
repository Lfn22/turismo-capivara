# Phase 10: Tourist Self-Service - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 10-tourist-self-service
**Areas discussed:** QR Code PIX, Cancelamento público, Fluxo da UI, Segurança do lookup

---

## QR Code PIX

| Option | Description | Selected |
|--------|-------------|----------|
| Salvar qrCode no banco | Migration simples, lookup imediato | ✓ |
| Chamar MP API de novo | Sem migration, mas latência extra | |
| Só mostrar link de pagamento | Zero mudança, ignora TOURIST-02 | |

**User's choice:** Salvar qrCode no banco

---

## Comportamento por Status

| Option | Description | Selected |
|--------|-------------|----------|
| Só status + detalhes | Ocultar pagamento em não-PENDING | |
| Redirecionar para contato | Mensagem de suporte para todos | |
| Freeform — modelo detalhado | Switch por status com fluxos distintos | ✓ |

**User's choice (freeform):** Modelo completo switch por status:
- PENDING: QR Code + countdown expiresAt
- CONFIRMED: badge verde, detalhes, WhatsApp guia, botão voucher
- EXPIRED: badge amarelo, botão "Gerar novo pagamento" → novo PIX no MP → status PENDING
- CANCELLED: badge vermelho, contato de suporte, sem CTA de pagamento

---

## Cancelamento — Cutoff

| Option | Description | Selected |
|--------|-------------|----------|
| 24h antes do tour | Simples, previsível | ✓ |
| Configurável por operadora | Mais flexível, mais complexo | |
| Sem cutoff | Nenhuma regra de negócio | |

**User's choice:** 24h antes do slot.startsAt

---

## Cancelamento — UX

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmação + email | Modal antes de cancelar, email disparado | ✓ |
| Direto sem modal | Mais rápido, sem friction | |
| Claude decide | | |

**User's choice:** Confirmação + email

---

## Fluxo da UI

| Option | Description | Selected |
|--------|-------------|----------|
| Single-page com estados | LOOKUP → RESULT na mesma rota | ✓ |
| Query params na URL | Email exposto na barra de endereço | |

**User's choice:** Single-page com estados

---

## UI Visual

| Option | Description | Selected |
|--------|-------------|----------|
| Card único com seções | Badge status + detalhes + ações | ✓ |
| Tela cheia por status | Hero colorido, mais impactante | |
| Claude decide | | |

**User's choice:** Card único com seções. Mobile-first obrigatório.

---

## Segurança — Rate Limiting

| Option | Description | Selected |
|--------|-------------|----------|
| Rate limit por IP | 10/min, padrão Phase 7 | |
| Rate limit IP + por email | Dupla proteção | |
| Freeform — estratégia detalhada | Dupla camada explícita com keyGenerator | ✓ |

**User's choice (freeform):** Dupla camada:
1. Global por IP (infraestrutura): ~20 req/min
2. Por email via keyGenerator: 5 tentativas / 15 min, chave `lookup:email:{email}`
- Erro 429 opaco: "Muitas tentativas para esta reserva. Tente novamente mais tarde."
- Normalizar email (.trim().toLowerCase()) em tudo
- Erro de validação sempre opaco: "Reserva não encontrada ou dados inválidos"

---

## Redis como Store

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, ativar Redis agora | Primeira use real, protege multi-container | ✓ |
| Não, usar memória | Simples, perde estado em restarts | |

**User's choice:** Sim, ativar Redis agora. REDIS_URL já no Railway.

---

## Claude's Discretion

- Estrutura interna do componente React
- Estilo do countdown do PIX
- Mensagens exatas dos templates de email
- Implementação da query LIKE para 6-char suffix

## Deferred Ideas

- Reembolso automático via MP refund API — v1.2
- Motivo de cancelamento — v1.2
- Notificação ao guia no cancelamento — v1.2
- Histórico de múltiplas reservas — v1.2
