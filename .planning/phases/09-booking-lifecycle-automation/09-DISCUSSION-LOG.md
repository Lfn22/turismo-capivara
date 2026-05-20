# Phase 9: Booking Lifecycle Automation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 09-booking-lifecycle-automation
**Areas discussed:** Templates de email, Janela de expiração, Arquitetura do cron, NOTIF-03 — guia aprovado

---

## Templates de Email

| Option | Description | Selected |
|--------|-------------|----------|
| Texto simples — padrão Phase 8 | Consistente com Phase 8. Rápido de implementar. NOTIF-05 já deferido para v1.2. | ✓ |
| HTML básico inline | Estrutura HTML simples sem dependências extras. Meio termo. | |
| React Email agora | Instalar react-email, criar componentes visuais. | |

**User's choice:** Texto simples — padrão Phase 8
**Notes:** Conflito resolvido: Phase 8 CONTEXT.md disse "visuais para Phase 9" mas REQUIREMENTS.md é fonte de verdade — NOTIF-05 fica para v1.2.

| Option | Description | Selected |
|--------|-------------|----------|
| Mesmo FROM de Phase 8 | Reutilizar endereço já configurado para aprovações de operadoras. | ✓ |
| Endereço dedicado por tipo | Ex: reservas@capi.turismo para transacional. | |

**User's choice:** Mesmo FROM de Phase 8

---

## Janela de Expiração

| Option | Description | Selected |
|--------|-------------|----------|
| Env var global BOOKING_EXPIRY_MINUTES=30 | Configurável no Railway sem redeploy. | ✓ |
| Constante hard-coded | 30 minutos no código. Zero config. | |

**User's choice:** Env var global

| Option | Description | Selected |
|--------|-------------|----------|
| Calculado em POST /bookings | expiresAt = createdAt + BOOKING_EXPIRY_MINUTES no momento da criação. | ✓ |
| Calculado no cron job | Cron calcula dinamicamente, campo fica null até lá. | |

**User's choice:** Calculado em POST /bookings

---

## Arquitetura do Cron

| Option | Description | Selected |
|--------|-------------|----------|
| fastify-cron plugin | Plugin oficial Fastify, integrado ao lifecycle (start/stop com servidor). | ✓ |
| node-cron puro | Lib standalone. Não integra com lifecycle Fastify. | |
| setInterval nativo | Zero dep. Frágil, sem cron syntax. | |

**User's choice:** fastify-cron plugin

| Option | Description | Selected |
|--------|-------------|----------|
| Advisory lock PostgreSQL | pg_try_advisory_lock — lock binário no BD. Zero infra extra. | ✓ |
| Flag em memória | is_running boolean. Não funciona com múltiplas instâncias. | |

**User's choice:** Advisory lock PostgreSQL

---

## NOTIF-03 — Guia Aprovado

> **Context:** guides.routes.ts já tem lógica de aprovação mas NÃO envia email — NOTIF-03 não está implementado.

| Option | Description | Selected |
|--------|-------------|----------|
| Inline em guides.routes.ts | Mesmo padrão de Phase 8 — email no handler de aprovação, sem service layer. | ✓ |
| Email service compartilhado | Criar services/email.service.ts centralizando todos os envios. | |

**User's choice:** Inline em guides.routes.ts

| Option | Description | Selected |
|--------|-------------|----------|
| Aprovação + link do painel | Simples: 'Sua conta foi aprovada, acesse: capi.turismo/[slug]/guia/perfil' | ✓ |
| Aprovação + próximos passos | Link + lembrete para completar perfil/portfolio. | |

**User's choice:** Apenas aprovação + link do painel

---

## Claude's Discretion

- Número do advisory lock (constante nomeada)
- Estrutura interna dos templates (saudação, corpo, assinatura)
- Ordem de registro do plugin fastify-cron em app.ts

## Deferred Ideas

- NOTIF-05: Templates React Email / design visual (v1.2)
- OPS-04: Queue de email com retry via BullMQ/Redis (v1.2)
- Emails de rejeição de guia
- Config de expiração por tenant
