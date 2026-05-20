# Roadmap: Turismo Capivara — v1.1 Launch Readiness

## Overview

Prepara o CAPI para usuários reais: onboarding de operadoras sem intervenção manual, emails transacionais em todo o ciclo de reserva, expiração automática de bookings não pagos, proteção da API com rate limiting, observabilidade com Sentry, migração LGPD do CPF no Booking, e self-service do turista para consultar reservas sem conta.

**Milestone:** v1.1 Launch Readiness
**Continues from:** v1.0 MVP (Phases 1–6, complete 2026-05-13)
**Phases:** 4 (Phase 7–10)
**Requirements:** 13 v1.1 requirements

---

## Phase Numbering

v1.0 MVP ended at Phase 6. v1.1 starts at Phase 7.

---

## Phases

- [x] **Phase 7: Platform Hardening** — Rate limiting + Sentry protegem e monitoram produção
- [x] **Phase 8: Operator Onboarding** — Operadoras se registram sem intervenção manual do dev
- [ ] **Phase 9: Booking Lifecycle Automation** — Expiração automática + emails transacionais em todo o ciclo
- [ ] **Phase 10: Tourist Self-Service** — Turista consulta e cancela reserva via email + código, sem conta

---

## Phase Details

### Phase 7: Platform Hardening
**Goal:** Rate limiting e monitoramento de erros estão ativos em produção antes de qualquer usuário real acessar a API.
**Depends on:** Phase 6 (v1.0 complete)
**Requirements:** OPS-02, OPS-03
**Success Criteria** (what must be TRUE):
  1. Requisições repetidas do mesmo IP para rotas de auth e booking público recebem 429 com header Retry-After após ultrapassar o limite configurado
  2. O endpoint `/webhooks/mercadopago` está na whitelist de rate limiting e nunca retorna 429 — payloads válidos do MP sempre são processados
  3. Qualquer exceção não tratada em qualquer rota Fastify aparece no Sentry com tenant slug, route path e stack trace
  4. O DSN do Sentry é lido de variável de ambiente — nenhum DSN hardcoded no código-fonte; environment tag diferencia production de staging
**Plans:** 2 plans

Plans:
- [x] 07-01-PLAN.md — Rate limiting: trustProxy, @fastify/rate-limit global, overrides por rota (auth 20/min, booking 60/min), webhook isento
- [x] 07-02-PLAN.md — Sentry: initSentry(), setupFastifyErrorHandler, filtro AppError, contexto tenant/usuário

---

### Phase 8: Operator Onboarding
**Goal:** Uma nova operadora pode criar sua conta e tenant via formulário público, sem que o desenvolvedor precise tocar no banco de dados.
**Depends on:** Phase 7
**Requirements:** ONBOARD-01, ONBOARD-02, ONBOARD-03, SEC-05
**Success Criteria** (what must be TRUE):
  1. Operadora preenche o formulário em `/onboarding` com nome, email, senha e slug — um Tenant + usuário ADMIN são criados atomicamente; qualquer falha parcial reverte a transação
  2. Após signup bem-sucedido, operadora vê checklist pós-cadastro: completar perfil, criar 1º guia, aguardar aprovação do sistema
  3. Super-admin pode aprovar ou rejeitar a operadora em painel central antes de ela ficar ativa no marketplace; operadora rejeitada não aparece em listagens públicas
  4. Nenhum CPF em plaintext existe na tabela `Booking` após a migração — lookup por email + código de reserva funciona corretamente com CPF hasheado
**Plans:** 3 plans

Plans:
- [ ] 08-01-PLAN.md — Schema migration, shared hashCpf utility, Wave 0 test stubs, DB push + seed
- [ ] 08-02-PLAN.md — API endpoints: signup, check-slug, pending list, approve, reject + email templates
- [ ] 08-03-PLAN.md — Web: middleware, onboarding form, aguardando checklist, super-admin panel
**UI hint**: yes

---

### Phase 9: Booking Lifecycle Automation
**Goal:** Bookings não pagos expiram automaticamente liberando a vaga, e cada transição de estado da reserva dispara o email transacional correto para o turista ou guia.
**Depends on:** Phase 8
**Requirements:** OPS-01, NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04
**Success Criteria** (what must be TRUE):
  1. Um booking criado mas não pago dentro da janela configurada (ex: 30 min) transiciona para EXPIRED via cron — a capacidade do slot é decrementada de volta e o slot fica disponível para novos turistas
  2. Turista recebe email imediato ao criar booking (status PENDING) com código PIX, QR code e prazo de pagamento
  3. Turista recebe email de confirmação quando pagamento PIX é aprovado (status CONFIRMED via webhook Mercado Pago)
  4. Turista recebe email de aviso quando booking expira — PIX não pago dentro do prazo
  5. CONDUTOR recebe email quando admin aprova sua conta de guia
**Plans:** 09-01 (fastify-cron infrastructure) ✓, 09-02 (email templates) ✓, 09-03 (booking expiry cron job) ✓, 09-04 (NOTIF-01 + NOTIF-02 wired) ✓, 09-05 (NOTIF-03 guide approval email) ✓

---

### Phase 10: Tourist Self-Service
**Goal:** Turista encontra e gerencia sua reserva usando apenas email + código da reserva — sem necessidade de criar conta ou fazer login.
**Depends on:** Phase 9
**Requirements:** TOURIST-01, TOURIST-02
**Success Criteria** (what must be TRUE):
  1. Turista acessa `/[slug]/minha-reserva`, insere email + últimos 6 caracteres do ID da reserva e vê detalhes completos: status, roteiro, data, guia, valor
  2. Se booking está PENDING, turista vê o QR code PIX na página de consulta e pode rever o prazo de pagamento
  3. Turista com booking cancelável (PENDING ou CONFIRMED, antes do cutoff) pode solicitar cancelamento pela página de consulta e recebe email de cancelamento
  4. O endpoint de lookup retorna erro genérico para combinações inválidas — não revela se o email ou o código individualmente existem no sistema
**Plans:** TBD
**UI hint**: yes

---

## Progress

| Phase | Nome | Plans Complete | Status | Concluída |
|-------|------|----------------|--------|-----------|
| 7 | Platform Hardening | 2/2 | Complete | 2026-05-17 |
| 8 | Operator Onboarding | 3/3 | Complete | 2026-05-19 |
| 9 | Booking Lifecycle Automation | 4/? | In progress | - |
| 10 | Tourist Self-Service | 0/? | Not started | - |

**v1.0 MVP (Phases 1–6): 6/6 complete**

| Phase | Nome | Plans | Status | Concluída |
|-------|------|-------|--------|-----------|
| 1 | Security Hardening | 4/4 | Complete | 2026-04-20 |
| 2 | Cadastro de Guias + Aprovação Admin | 4/4 | Complete | 2026-04-28 |
| 3 | Roteiros e Disponibilidade | 3/3 | Complete | 2026-04-30 |
| 4 | Motor de Pagamento | 3/3 | Complete | 2026-05-05 |
| 5 | Painel do Guia | 6/6 | Complete | 2026-05-13 |
| 6 | Interface do Turista | 4/4 | Complete | 2026-05-13 |
| 7 | Platform Hardening | 3/3 | Complete | 2026-05-17 |
| 8 | Operator Onboarding | 3/3 | Complete | 2026-05-19 |
| 9 | Booking Lifecycle Automation | 4/5 | In Progress | — |
