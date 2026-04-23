# REQUIREMENTS.md — Turismo Capivara

**Project:** Marketplace de guias de turismo — turistas encontram, comparam e reservam guias para roteiros específicos com pagamento integrado.

**v1 scope:** 26 requirements across 8 categories.

---

## v1 Requirements

### Security (SEC) — Bloqueante para pagamento

- [x] **SEC-01**: Todas as rotas da API validam input com Zod antes de processar dados (nenhuma rota aceita payload sem schema validation)
- [x] **SEC-02**: CORS configurado via variável de ambiente (não hardcoded); @fastify/helmet registrado e ativo em produção
- [x] **SEC-03**: Endpoints de booking, cancelamento e confirmação exigem autenticação JWT válida; cross-tenant ownership verificado em cada operação
- [x] **SEC-04**: Plataforma oferece política de privacidade (LGPD) e usuário pode exportar/deletar seus dados

### Auth (AUTH)

- [x] **AUTH-01**: Turista pode criar conta com email/senha e acessar a plataforma como CLIENTE
- [x] **AUTH-02**: Guia pode criar conta com CPF/CNPJ e aguardar aprovação como CONDUTOR
- [ ] **AUTH-03**: Admin pode aprovar ou rejeitar cadastro de guia; guia rejeitado recebe notificação de status

### Guide Profiles (GUIDE)

- [ ] **GUIDE-01**: Guia tem perfil público com foto, bio, especialidades e lista de regiões atendidas
- [ ] **GUIDE-02**: Guias aprovados exibem badge visual de guia verificado no perfil e nas listagens
- [ ] **GUIDE-03**: Guias podem ser agrupados sob uma operadora ou empresa com perfil compartilhado
- [ ] **GUIDE-04**: Guia pode adicionar portfólio de fotos de experiências ao próprio perfil

### Packages & Itineraries (PKG)

- [ ] **PKG-01**: Guia pode criar roteiro com título, descrição, preço, nível de dificuldade e slots de saída com datas
- [ ] **PKG-02**: Múltiplos guias podem oferecer o mesmo roteiro com preços distintos e visíveis para comparação
- [ ] **PKG-03**: Guia define número mínimo e máximo de participantes por slot ao criar ou editar disponibilidade
- [ ] **PKG-04**: Guia pode gerenciar calendário de disponibilidade: adicionar, editar e cancelar slots futuros

### Discovery & Search (DISC)

- [ ] **DISC-01**: Turista pode filtrar roteiros disponíveis por região (implementada como tags de localização)
- [ ] **DISC-02**: Turista pode ver múltiplos guias para o mesmo roteiro lado a lado com preços e badges (comparação)
- [ ] **DISC-03**: Turista pode buscar roteiros por nome de roteiro ou destino via campo de busca textual
- [ ] **DISC-04**: Listagem paginada de todos os roteiros disponíveis é exibida na página inicial

### Bookings (BOOK)

- [ ] **BOOK-01**: Turista pode reservar slot com garantia transacional de capacidade (anti-overbooking em concorrência)
- [ ] **BOOK-02**: Reserva transita automaticamente para CONFIRMED após pagamento aprovado pelo gateway
- [ ] **BOOK-03**: Turista pode cancelar reserva; política de reembolso aplicada conforme regra de antecedência

### Payments (PAY)

- [ ] **PAY-01**: Turista pode pagar reserva via PIX (Mercado Pago); confirmação instantânea após pagamento
- [ ] **PAY-02**: Turista pode pagar reserva com cartão de crédito (Mercado Pago) como alternativa ao PIX
- [ ] **PAY-03**: Plataforma calcula e repassa automaticamente o valor líquido ao guia após confirmação da reserva

### Storefronts (STORE)

- [ ] **STORE-01**: Admin pode cadastrar hotéis e restaurantes parceiros para exibição em destaque em roteiros relacionados (display only — sem booking)

---

## v2 Requirements (Deferred)

- **PAY-v2-01**: Pagamento via Stripe para turistas internacionais (moeda estrangeira)
- **BOOK-v2-01**: Checkout multi-guia: carrinho com múltiplos roteiros de guias diferentes em uma transação
- **TRUST-v2-01**: Sistema de avaliações: turista avalia guia após conclusão do roteiro
- **GUIDE-v2-01**: Reviews com nota média exibida no perfil e nas listagens
- **MSG-v2-01**: Mensagens entre turista e guia antes da confirmação
- **ADMIN-v2-01**: Dashboard de análise para guias (receita, taxa de ocupação, avaliações)

---

## Out of Scope

- Booking de hotéis/restaurantes dentro da plataforma — storefronts são display only; complexidade de pagamento split não justifica MVP
- White-label multi-marketplace — requer infraestrutura de isolamento além do escopo de brownfield atual
- Algoritmo de ranking ML para listagens — prematura otimização; relevância manual suficiente para MVP
- Arbitragem de disputas de reembolso — requer suporte humano; escalar com volume
- Painel administrativo regional — admins usam painel geral de tenant para v1
- Tours multi-trecho ou multi-destino — complexidade de itinerário fora do escopo MVP
- Seguro ou garantia de viagem — requer parceria jurídica; fora do produto

---

## Validated (Already in Codebase)

- ✓ **AUTH-E-01**: JWT authentication com login/logout e sessão persistida — *existing*
- ✓ **AUTH-E-02**: Multi-tenant isolation por slug com roles ADMIN, ATENDENTE, CONDUTOR, CLIENTE — *existing*
- ✓ **BOOK-E-01**: Sistema de booking com slots de capacidade, transação atômica anti-overbooking e ciclo de status PENDING→CONFIRMED→COMPLETED — *existing*
- ✓ **PKG-E-01**: Tour packages com título, descrição, preço e nível de dificuldade — *existing*
- ✓ **INFRA-E-01**: Deploy Railway com Nixpacks, monorepo Turborepo, pnpm workspaces — *existing*

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| SEC-01 | Phase 1 — Security Hardening | Complete |
| SEC-02 | Phase 1 — Security Hardening | Complete |
| SEC-03 | Phase 1 — Security Hardening | Complete |
| SEC-04 | Phase 1 — Security Hardening | Complete |
| AUTH-01 | Phase 2 — User Access & Guide Onboarding | Complete |
| AUTH-02 | Phase 2 — User Access & Guide Onboarding | Complete |
| AUTH-03 | Phase 2 — User Access & Guide Onboarding | Pending |
| GUIDE-01 | Phase 2 — User Access & Guide Onboarding | Pending |
| GUIDE-02 | Phase 2 — User Access & Guide Onboarding | Pending |
| GUIDE-03 | Phase 2 — User Access & Guide Onboarding | Pending |
| GUIDE-04 | Phase 2 — User Access & Guide Onboarding | Pending |
| PKG-01 | Phase 3 — Itineraries & Availability | Pending |
| PKG-02 | Phase 3 — Itineraries & Availability | Pending |
| PKG-03 | Phase 3 — Itineraries & Availability | Pending |
| PKG-04 | Phase 3 — Itineraries & Availability | Pending |
| DISC-01 | Phase 4 — Marketplace Discovery | Pending |
| DISC-02 | Phase 4 — Marketplace Discovery | Pending |
| DISC-03 | Phase 4 — Marketplace Discovery | Pending |
| DISC-04 | Phase 4 — Marketplace Discovery | Pending |
| STORE-01 | Phase 4 — Marketplace Discovery | Pending |
| BOOK-01 | Phase 5 — Booking & Payments | Pending |
| BOOK-02 | Phase 5 — Booking & Payments | Pending |
| BOOK-03 | Phase 5 — Booking & Payments | Pending |
| PAY-01 | Phase 5 — Booking & Payments | Pending |
| PAY-02 | Phase 5 — Booking & Payments | Pending |
| PAY-03 | Phase 5 — Booking & Payments | Pending |

**Coverage:** 26/26 v1 requirements mapped. No orphans.

---

*Last updated: 2026-04-17 — traceability populated by roadmapper*
