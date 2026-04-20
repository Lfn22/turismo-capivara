# Roadmap: Turismo Capivara

## Overview

Evolução de uma SaaS de turismo brownfield para um marketplace onde turistas encontram, comparam e reservam guias para roteiros específicos com pagamento integrado via Mercado Pago. O caminho vai de corrigir vulnerabilidades de segurança que bloqueiam pagamentos, passar por onboarding de guias e criação de roteiros, até chegar na descoberta comparativa — o diferencial central do produto — e fechar com transação completa via PIX.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Security Hardening** - Corrigir as 6 vulnerabilidades críticas do codebase atual que bloqueiam o lançamento com pagamentos
- [ ] **Phase 2: User Access & Guide Onboarding** - Turistas criam conta, guias se cadastram e passam por aprovação de admin
- [ ] **Phase 3: Itineraries & Availability** - Guia cria e publica roteiros com preço, dificuldade e calendário de slots
- [ ] **Phase 4: Marketplace Discovery** - Turista pesquisa, filtra e compara guias lado a lado para o mesmo roteiro
- [ ] **Phase 5: Booking & Payments** - Turista reserva, paga via PIX ou cartão e recebe confirmação; guia recebe repasse

## Phase Details

### Phase 1: Security Hardening
**Goal**: Todas as rotas da API têm validação de input, autenticação forçada, CORS e helmet configurados para produção — pré-requisito para habilitar pagamentos.
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04
**Success Criteria** (what must be TRUE):
  1. Nenhuma rota da API aceita payload sem schema Zod — requisições malformadas retornam 400 com erro descritivo
  2. CORS aceita o domínio de produção (configurado via variável de ambiente) e rejeita origens não autorizadas
  3. `@fastify/helmet` está ativo e responde com headers de segurança em produção
  4. Endpoints de booking e cancelamento retornam 401 para requisições sem JWT válido
  5. Usuário pode visualizar política de privacidade e solicitar exportação ou exclusão dos próprios dados
**Plans**: TBD

### Phase 2: User Access & Guide Onboarding
**Goal**: Turistas criam conta com email/senha, guias se cadastram com CPF/CNPJ e aguardam aprovação de admin, perfis públicos de guia ficam visíveis após aprovação.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, GUIDE-01, GUIDE-02, GUIDE-03, GUIDE-04
**Success Criteria** (what must be TRUE):
  1. Turista cria conta com email/senha e acessa a plataforma com role CLIENTE
  2. Guia submete cadastro com CPF/CNPJ e vê status "aguardando aprovação" após registro
  3. Admin aprova ou rejeita guia via painel; guia recebe notificação de status após decisão
  4. Perfil público do guia aprovado exibe foto, bio, especialidades, regiões atendidas e badge de "guia verificado"
  5. Guias com mesma operadora aparecem agrupados sob a marca da empresa no perfil
**Plans**: TBD
**UI hint**: yes

### Phase 3: Itineraries & Availability
**Goal**: Guia aprovado cria roteiros com título, descrição, preço e dificuldade, define slots de saída com datas e capacidade, e gerencia seu calendário de disponibilidade.
**Depends on**: Phase 2
**Requirements**: PKG-01, PKG-02, PKG-03, PKG-04
**Success Criteria** (what must be TRUE):
  1. Guia cria roteiro preenchendo título, descrição, preço por pessoa, nível de dificuldade e vincula a uma região (tag)
  2. Dois guias distintos publicam o mesmo roteiro com preços diferentes e ambos ficam visíveis na plataforma
  3. Guia define mínimo e máximo de participantes ao criar um slot de saída; slot com mínimo não atingido é visível mas não reservável
  4. Guia adiciona, edita e cancela slots futuros no próprio calendário de disponibilidade
**Plans**: TBD
**UI hint**: yes

### Phase 4: Marketplace Discovery
**Goal**: Turista pesquisa roteiros por nome ou destino, filtra por região e vê múltiplos guias para o mesmo roteiro lado a lado com preços e badges — o diferencial central do produto.
**Depends on**: Phase 3
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, STORE-01
**Success Criteria** (what must be TRUE):
  1. Página inicial exibe listagem paginada de todos os roteiros disponíveis publicados por guias aprovados
  2. Turista filtra roteiros por região/destino via tag e vê apenas os roteiros daquela localidade
  3. Turista busca por nome de roteiro ou destino via campo de texto e recebe resultados relevantes
  4. Turista seleciona um roteiro e vê múltiplos guias disponíveis lado a lado com preço individual, badge de verificado e disponibilidade de slots
  5. Admin cadastra hotel ou restaurante parceiro com foto, info e link externo; vitrine aparece associada a roteiros relacionados (display only)
**Plans**: TBD
**UI hint**: yes

### Phase 5: Booking & Payments
**Goal**: Turista reserva um slot com garantia anti-overbooking, paga via PIX ou cartão de crédito (Mercado Pago), recebe confirmação instantânea e pode cancelar; plataforma calcula e registra repasse ao guia.
**Depends on**: Phase 4
**Requirements**: BOOK-01, BOOK-02, BOOK-03, PAY-01, PAY-02, PAY-03
**Success Criteria** (what must be TRUE):
  1. Turista reserva vaga em um slot e a reserva é garantida transacionalmente — dois turistas simultâneos não conseguem exceder a capacidade do slot
  2. Após aprovação do PIX pelo Mercado Pago, a reserva transita automaticamente para CONFIRMED e turista vê confirmação na tela
  3. Turista paga reserva com cartão de crédito via Mercado Pago como alternativa ao PIX
  4. Turista cancela reserva dentro do prazo da política; reembolso é calculado conforme regra de antecedência
  5. Após confirmação do pagamento, a plataforma calcula o valor líquido (total menos comissão %) e registra o repasse ao guia
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Hardening | 2/4 | In Progress|  |
| 2. User Access & Guide Onboarding | 0/TBD | Not started | - |
| 3. Itineraries & Availability | 0/TBD | Not started | - |
| 4. Marketplace Discovery | 0/TBD | Not started | - |
| 5. Booking & Payments | 0/TBD | Not started | - |
