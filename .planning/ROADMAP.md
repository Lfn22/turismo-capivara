# Roadmap: Turismo Capivara — MVP

## Overview

SaaS de turismo com foco inicial na Serra da Capivara (PI) como beachhead, construído para escalar para qualquer destino de ecoturismo e turismo histórico. O MVP valida o ciclo completo: guia se cadastra e publica roteiros → turista encontra, reserva e paga → guia recebe confirmação e gerencia seu painel.

A arquitetura multi-tenant já existe. O motor de reserva com trava transacional já existe. O que o MVP entrega é a camada de identidade (cadastro/aprovação), a gestão de conteúdo pelo guia, o pagamento integrado e as interfaces web.

**Estratégia de negócio:** Comissão sobre transação (3–5% por reserva) em vez de assinatura mensal. Contato institucional com FUMDHAM/SETUR-PI após MVP rodando com dados reais.

## Phase Numbering

- Integer phases (1, 2, 3…): Trabalho planejado do milestone
- Decimal phases (2.1, 2.2): Inserções urgentes (marcadas com INSERTED)

## Phases

- [x] **Phase 1: Security Hardening** — 6 vulnerabilidades críticas corrigidas, API pronta para produção
- [ ] **Phase 2: Cadastro de Guias + Aprovação Admin** — Registro de turistas e guias, aprovação por admin, perfis públicos
- [x] **Phase 3: Roteiros e Disponibilidade** — Guia cria e gerencia roteiros e calendário de slots
- [x] **Phase 4: Motor de Pagamento** — PIX via Mercado Pago + webhook de confirmação
- [ ] **Phase 5: Painel do Guia** — Interface web para o guia gerenciar reservas, pagamentos e roteiros
- [ ] **Phase 6: Interface do Turista** — Listagem de guias, perfil, fluxo de reserva e confirmação

---

## Phase Details

### Phase 1: Security Hardening
**Goal**: API segura e pronta para produção — validação de input, autenticação em todos os endpoints, CORS/Helmet configurados, LGPD implementado.
**Status**: Complete (2026-04-20)
**Plans**: 4/4 executados e verificados
**Success Criteria**:
  1. Todas as rotas validam payload com Zod — requisições malformadas retornam 400
  2. CORS aceita domínio de produção via env e rejeita origens não autorizadas
  3. `@fastify/helmet` ativo e respondendo com headers de segurança
  4. Endpoints de booking exigem JWT válido — 401 sem autenticação
  5. Usuário pode exportar e solicitar exclusão dos próprios dados (LGPD)

---

### Phase 2: Cadastro de Guias + Aprovação Admin
**Goal**: Turistas criam conta, guias se cadastram com CPF e aguardam aprovação de admin. Após aprovação, perfil público do guia fica visível na plataforma.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, GUIDE-01, GUIDE-02, GUIDE-03, GUIDE-04

**Schema — extensões necessárias no modelo User:**
- `approvalStatus`: enum PENDING | APPROVED | REJECTED (nullable, só para CONDUTOR)
- `cpf`: String? (obrigatório no registro de CONDUTOR)
- `bio`: String?
- `photoUrl`: String?
- `specialties`: String[] (ex: arqueologia, trilha, fotografia)
- `regions`: String[] (ex: Serra da Capivara, Piauí)
- `rejectionReason`: String?

**Endpoints a construir:**

| Endpoint | Acesso | Finalidade |
|---|---|---|
| POST /auth/register | Público | Cadastro CLIENTE ou CONDUTOR (CONDUTOR inicia PENDING) |
| GET /admin/tenants/:slug/guides | ADMIN | Lista guias com filtro de status |
| PATCH /admin/tenants/:slug/guides/:id/status | ADMIN | Aprovar ou rejeitar guia |
| GET /tenants/:slug/guides | Público | Lista guias aprovados do tenant |
| GET /tenants/:slug/guides/:id | Público | Perfil público do guia |
| PUT /tenants/:slug/guides/me | CONDUTOR | Guia atualiza próprio perfil |

**Status**: Não iniciada (2 planos de schema+registro escritos, não executados)
**Plans**: TBD

**Success Criteria**:
  1. Turista cria conta com email/senha e acessa a plataforma com role CLIENTE
  2. Guia submete cadastro com CPF, bio e especialidades — status inicial é PENDING
  3. Admin aprova ou rejeita guia via painel; status muda para APPROVED ou REJECTED
  4. Perfil público do guia aprovado exibe foto, bio, especialidades e regiões atendidas
  5. Guia rejeitado não aparece na listagem pública

---

### Phase 3: Roteiros e Disponibilidade
**Goal**: Guia aprovado cria e publica roteiros com preço e dificuldade, define slots de saída com datas e capacidade, e gerencia seu calendário.
**Depends on**: Phase 2
**Requirements**: PKG-01, PKG-02, PKG-03, PKG-04

> **Nota:** TourPackage e DepartureSlot já existem no schema e têm endpoints de leitura. O que falta é a gestão pelo próprio guia (create/update/delete).

**Endpoints a construir:**

| Endpoint | Acesso | Finalidade |
|---|---|---|
| POST /tenants/:slug/packages | CONDUTOR | Guia cria roteiro |
| PUT /tenants/:slug/packages/:id | CONDUTOR | Guia edita roteiro |
| DELETE /tenants/:slug/packages/:id | CONDUTOR | Guia remove roteiro |
| POST /tenants/:slug/packages/:id/slots | CONDUTOR | Guia cria slot de data |
| PATCH /tenants/:slug/packages/:id/slots/:slotId | CONDUTOR | Edita slot |
| DELETE /tenants/:slug/packages/:id/slots/:slotId | CONDUTOR | Remove slot |

**Status**: Complete (2026-04-30)
**Plans**: 3 plans
- [x] 03-01-PLAN.md — Schema migration: add conductorId to TourPackage + minCapacity to DepartureSlot
- [x] 03-02-PLAN.md — Package CRUD endpoints (POST/PUT/DELETE) with ownership + hasMinimumReached in GET
- [x] 03-03-PLAN.md — Slot CRUD endpoints (POST/PATCH/DELETE) with cascade booking cancellation

**Success Criteria**:
  1. Guia cria roteiro com título, descrição, preço por pessoa e nível de dificuldade
  2. Guia define slot de saída com data, vagas mínimas e máximas
  3. Guia edita e cancela slots futuros no calendário de disponibilidade
  4. Roteiro inativo não aparece para turistas

---

### Phase 4: Motor de Pagamento
**Goal**: Turista reserva um slot (trava transacional já existe) e paga via PIX pelo Mercado Pago. Webhook confirma o pagamento e transiciona a reserva para CONFIRMED automaticamente.
**Depends on**: Phase 3
**Requirements**: BOOK-01, BOOK-02, PAY-01, PAY-02

> **Nota:** A trava transacional anti-overbooking já está implementada no POST /tenants/:slug/bookings. O que falta é a geração do link de pagamento e o webhook de confirmação.

**O que construir:**

| Componente | Detalhe |
|---|---|
| Integração SDK Mercado Pago | `@mercadopago/sdk-js` — geração de preference/link |
| Modificar POST /bookings | Ao criar reserva → gera preference MP → retorna `payment_url` junto com a reserva |
| POST /webhooks/mercadopago | Recebe `payment.updated` → valida assinatura → muda booking para CONFIRMED |
| Idempotência no webhook | Evitar dupla confirmação em retentativas do MP |

**Status**: Complete (2026-05-05)
**Plans**: 3 planos

Plans:
- [x] 04-01-PLAN.md — Setup, schema, AppError, fastify-raw-body, vitest
- [x] 04-02-PLAN.md — PaymentService PIX + POST /bookings com compensação
- [x] 04-03-PLAN.md — Webhook handler HMAC + transições de booking

**Success Criteria**:
  1. Ao criar reserva, turista recebe `payment_url` direto para o Mercado Pago
  2. Após pagamento aprovado no MP, booking transiciona automaticamente para CONFIRMED via webhook
  3. Webhook rejeita eventos sem assinatura válida do Mercado Pago
  4. Dois turistas simultâneos no mesmo slot não excedem a capacidade (garantia transacional)

---

### Phase 5: Painel do Guia
**Goal**: Interface web para o guia gerenciar reservas, pagamentos, roteiros e disponibilidade. Interface admin para aprovar ou rejeitar guias.
**Depends on**: Phase 4
**Requirements**: GUIDE-02, GUIDE-03, GUIDE-04

**Telas do guia:**

| Tela | O que mostra |
|---|---|
| Dashboard | Resumo: reservas pendentes, reservas pagas, próximos slots |
| Reservas | Lista com nome do turista, data do slot, status (PENDING / CONFIRMED / CANCELLED) |
| Roteiros | Meus roteiros ativos, criar novo, editar |
| Disponibilidade | Calendário de slots com vagas abertas e fechadas |
| Perfil | Editar bio, foto, especialidades e regiões |

**Tela admin:**

| Tela | O que faz |
|---|---|
| Aprovação de guias | Lista PENDING com CPF, bio, especialidades → botão Aprovar / Rejeitar com motivo |

**Status**: Em planejamento
**Plans**: 6 planos

Plans:
- [ ] 05-01-PLAN.md — API gaps (GET /guides/me/bookings + PATCH /guides/me/profile) + instalar next-auth/react-calendar
- [ ] 05-02-PLAN.md — NextAuth wiring: lib/auth.ts, middleware.ts, /[slug]/login page
- [ ] 05-03-PLAN.md — Componentes compartilhados: SidebarNav, StatusBadge, Modal, layouts de route group
- [ ] 05-04-PLAN.md — Telas Dashboard e Reservas (consume GET /guides/me/bookings)
- [ ] 05-05-PLAN.md — Telas Roteiros e Disponibilidade (calendário react-calendar + modal de slot)
- [ ] 05-06-PLAN.md — Tela Perfil (GUIDE-02 badge) + Admin Guias (GUIDE-03) + remoção de legacy

**Success Criteria**:
  1. Guia acessa painel e vê reservas organizadas por status e data
  2. Guia distingue reservas aguardando pagamento das confirmadas
  3. Guia cria e edita roteiros diretamente pelo painel
  4. Admin vê guias pendentes e aprova ou rejeita com motivo registrado

---

### Phase 6: Interface do Turista
**Goal**: Interface web mínima para o turista encontrar um guia, ver disponibilidade, reservar e pagar. Listagem por destino, sem discovery avançado.
**Depends on**: Phase 5
**Requirements**: DISC-01, BOOK-01, BOOK-02, PAY-01

**Telas:**

| Tela | O que faz |
|---|---|
| Home / Listagem | Guias aprovados por destino, com foto, especialidades e roteiros disponíveis |
| Perfil do guia | Bio, roteiros publicados, calendário de slots com vagas |
| Fluxo de reserva | Selecionar slot → preencher nome/email → ir para pagamento |
| Redirect Mercado Pago | Pagamento externo |
| Confirmação | "Reserva confirmada. Você receberá contato do guia." |

**Deferred (pós-MVP):**
- Busca por texto e filtros avançados
- Comparação de guias lado a lado
- Multi-guia por roteiro
- Reviews e avaliações
- Vitrines de parceiros (hotéis, restaurantes)
- Relatórios institucionais (FUMDHAM / SETUR-PI)

**Status**: Não iniciada
**Plans**: TBD

**Success Criteria**:
  1. Turista encontra um guia navegando pela listagem do destino
  2. Turista reserva um slot e é redirecionado para o Mercado Pago
  3. Após pagamento, turista vê tela de confirmação com detalhes da reserva
  4. Fluxo completo funciona sem conta cadastrada (guest checkout)

---

## Progress

| Phase | Nome | Plans | Status | Concluída |
|-------|------|-------|--------|-----------|
| 1 | Security Hardening | 4/4 | Complete | 2026-04-20 |
| 2 | Cadastro de Guias + Aprovação Admin | 4/4 | Complete | 2026-04-28 |
| 3 | Roteiros e Disponibilidade | 3/3 | Complete | 2026-04-30 |
| 4 | Motor de Pagamento | 3/3 | Complete | 2026-05-05 |
| 5 | Painel do Guia | 0/TBD | Not started | — |
| 6 | Interface do Turista | 0/TBD | Not started | — |
