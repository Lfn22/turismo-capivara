# REQUIREMENTS.md — Turismo Capivara

**Project:** Marketplace de guias de turismo — turistas encontram, comparam e reservam guias para roteiros específicos com pagamento integrado.

**Current milestone:** v1.1 Launch Readiness — 13 requirements across 5 categories.

---

## v1.1 Requirements

### Onboarding (ONBOARD)

- [ ] **ONBOARD-01**: Operadora pode criar conta via endpoint público (nome, email, senha, slug) — cria Tenant + 1º usuário ADMIN atomicamente com proteção contra race condition
- [ ] **ONBOARD-02**: Operadora acessa página `/onboarding` com formulário de cadastro e checklist pós-signup (completar perfil, criar 1º guia, aguardar aprovação do sistema)
- [ ] **ONBOARD-03**: Super-admin pode aprovar ou rejeitar novas operadoras via painel central antes de ficarem ativas no marketplace

### Notificações (NOTIF)

- [ ] **NOTIF-01**: Turista recebe email de confirmação de reserva com código PIX, QR code e prazo de pagamento imediatamente após criar booking
- [ ] **NOTIF-02**: Turista recebe email de confirmação quando pagamento PIX é confirmado via webhook do Mercado Pago
- [ ] **NOTIF-03**: CONDUTOR recebe email quando admin aprova sua conta de guia
- [ ] **NOTIF-04**: Turista recebe email de aviso quando booking expira (PIX não pago dentro do prazo)

### Operações (OPS)

- [ ] **OPS-01**: Sistema expira automaticamente bookings com status PENDING após `expiresAt` e libera a capacidade do slot correspondente (cron a cada 60s, com lock de concorrência)
- [ ] **OPS-02**: API limita requisições por IP em rotas de autenticação e endpoints públicos de booking; rotas de webhook do Mercado Pago são isentas
- [ ] **OPS-03**: Erros não tratados em produção são capturados com contexto de tenant/usuário e alertados via Sentry

### Segurança (SEC)

- [ ] **SEC-05**: CPF do turista no model Booking é armazenado como hash HMAC-SHA256 (nunca em plaintext); migração segura em 4 fases com dual-read durante janela de transição (LGPD)

### Self-service do Turista (TOURIST)

- [ ] **TOURIST-01**: Turista pode consultar sua reserva usando email + código da reserva (últimos 6 caracteres do ID) via endpoint público sem necessidade de conta
- [ ] **TOURIST-02**: Turista pode visualizar o status atual da reserva e rever o QR code PIX se ainda PENDING via página `/[slug]/minha-reserva`

---

## v1.1 Future Requirements (Deferred)

- **NOTIF-05**: Templates de email com design visual — email básico resolve para lançamento (v1.2)
- **OPS-04**: Queue de email com retry automático via BullMQ/Redis — fire-and-forget com logging suficiente para v1.1 (v1.2 se volume escalar)
- **ONBOARD-04**: Verificação de email no signup — aprovação manual do super-admin compensa por ora (v1.2)
- **TOURIST-03**: Links de recuperação com token por email — re-entrar no checkout resolve o imediato (v1.2)
- **SEC-06**: Chave de idempotência em POST /bookings — risco baixo para v1.1 (v1.2)

---

## Out of Scope (v1.1)

- **Pagamento com cartão de crédito** — PIX tem conversão superior no Brasil para ticket < R$500; cartão adiciona 3DS + antifraude (v2)
- **Split payment / repasse automático ao guia** — requer conta MP verificada do guia, compliance Enterprise (v2)
- **PDF de voucher** — email de confirmação resolve; ninguém pede PDF antes de 50 clientes (v2)
- **Comparação de guias side-by-side** — sem volume de guias para fazer sentido (v2)
- **Filtros e busca avançada** — sem dados, filtros sempre vazios (v2 quando > 20 pacotes)
- **Rotas /destinos/* (discovery global)** — marketplace cross-tenant; estabilizar multi-tenant primeiro (v2)
- **Notificações por WhatsApp/SMS** — email resolve com 1/10 do esforço (v2)
- **SSO/OAuth para operadoras** — email+senha suficiente para early adopters B2B (v2)
- **CAPTCHA no signup** — monitorar; adicionar se spam > 10/dia (v1.5 se necessário)

---

## Validated (v1.0 MVP — Completo)

| REQ-ID | Descrição | Fase |
|--------|-----------|------|
| SEC-01 | Input validation com Zod em todas as rotas | Phase 1 |
| SEC-02 | CORS configurável por env + Helmet ativo | Phase 1 |
| SEC-03 | Endpoints de booking protegidos por JWT | Phase 1 |
| SEC-04 | CPF de usuário hasheado HMAC-SHA256 (LGPD) | Phase 1 |
| AUTH-01 | Turista pode se registrar e autenticar | Phase 2 |
| AUTH-02 | Guia pode se registrar com CPF e aguardar aprovação | Phase 2 |
| AUTH-03 | Admin pode aprovar ou rejeitar guias | Phase 2 |
| GUIDE-01 | Guia pode criar e editar perfil público | Phase 2 |
| GUIDE-02 | Guia exibe badge "Verificado" quando aprovado | Phase 2 |
| GUIDE-03 | Turista pode ver perfil público do guia | Phase 2 |
| GUIDE-04 | Guia pode adicionar fotos ao portfólio | Phase 2 |
| PKG-01 | Guia pode criar roteiros com preço e capacidade | Phase 3 |
| PKG-02 | Guia pode gerenciar slots de saída (calendário) | Phase 3 |
| PKG-03 | Turista pode ver listagem de roteiros | Phase 3 |
| PKG-04 | Turista pode ver detalhe de roteiro com guia | Phase 3 |
| DISC-01 | Turista pode filtrar roteiros por destino | Phase 4 |
| DISC-02 | Turista pode pesquisar guias | Phase 4 |
| DISC-03 | Turista pode ver destinos disponíveis | Phase 4 |
| DISC-04 | Turista pode comparar guias para o mesmo roteiro | Phase 4 |
| STORE-01 | Vitrines de parceiros vinculadas a roteiros | Phase 4 |
| BOOK-01 | Turista pode reservar um slot com anti-overbooking | Phase 5 |
| BOOK-02 | Admin pode confirmar e cancelar reservas | Phase 5 |
| BOOK-03 | Guia pode ver suas reservas no painel | Phase 5 |
| PAY-01 | Turista paga via PIX com QR code (Mercado Pago) | Phase 5 |
| PAY-02 | Webhook valida assinatura HMAC e confirma booking | Phase 5 |
| PAY-03 | Guia pode ver painel com reservas e valores | Phase 5 |

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| ONBOARD-01 | Phase 8 | Pending |
| ONBOARD-02 | Phase 8 | Pending |
| ONBOARD-03 | Phase 8 | Pending |
| NOTIF-01 | Phase 9 | Pending |
| NOTIF-02 | Phase 9 | Pending |
| NOTIF-03 | Phase 9 | Pending |
| NOTIF-04 | Phase 9 | Pending |
| OPS-01 | Phase 9 | Pending |
| OPS-02 | Phase 7 | Pending |
| OPS-03 | Phase 7 | Pending |
| SEC-05 | Phase 8 | Pending |
| TOURIST-01 | Phase 10 | Pending |
| TOURIST-02 | Phase 10 | Pending |

**Coverage:** 13/13 v1.1 requirements. No orphans. Phases assigned by roadmapper.

---

*Last updated: 2026-05-15 — Roadmap v1.1 created, phases 7-10 assigned*
