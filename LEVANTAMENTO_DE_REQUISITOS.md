# Levantamento de Requisitos — Turismo Capivara

**Projeto:** Marketplace de guias de turismo
**Versão:** 1.0
**Data:** 18/04/2026
**Status:** Em desenvolvimento

---

## 1. Visão Geral do Sistema

O **Turismo Capivara** é um marketplace B2C que conecta turistas a guias de turismo locais. Turistas podem encontrar, comparar e reservar guias para roteiros específicos com pagamento integrado via PIX (Mercado Pago).

### 1.1 Problema

O mercado de guias de turismo é fragmentado e informal: turistas não conseguem comparar guias e preços em um único lugar, e guias não têm canal digital estruturado para vender seus serviços.

### 1.2 Solução

Plataforma web multi-tenant onde:
- **Turistas** encontram roteiros, comparam guias lado a lado e reservam com pagamento integrado
- **Guias** publicam roteiros, gerenciam disponibilidade e recebem pagamentos automaticamente
- **Operadoras** agrupam múltiplos guias sob uma marca compartilhada
- **Admins** aprovam guias, gerenciam parceiros e supervisionam o marketplace

### 1.3 Diferencial Principal

Comparação de guias: múltiplos guias oferecem o mesmo roteiro com preços distintos, visíveis lado a lado — funcionalidade não disponível em marketplaces estáticos como GetYourGuide.

---

## 2. Stakeholders

| Perfil | Role no sistema | Necessidades principais |
|--------|-----------------|------------------------|
| Turista | CLIENTE | Encontrar guias, comparar preços, reservar e pagar com PIX |
| Guia individual | CONDUTOR | Publicar roteiros, gerenciar disponibilidade, receber pagamentos |
| Operadora de turismo | — | Agrupar guias sob marca, centralizar gestão |
| Administrador | ADMIN | Aprovar guias, cadastrar parceiros, supervisionar plataforma |
| Atendente | ATENDENTE | Suporte operacional, gestão de reservas |

---

## 3. Escopo do Sistema

### 3.1 Dentro do Escopo (v1)

- Cadastro e autenticação de turistas e guias
- Fluxo de aprovação de guias por admin
- Perfis públicos de guias com portfólio
- Criação e gestão de roteiros com slots de disponibilidade
- Sistema de busca e filtros por região
- Comparação de guias para o mesmo roteiro
- Reservas com controle transacional de capacidade
- Pagamento via PIX e cartão de crédito (Mercado Pago)
- Repasse automático de comissão ao guia
- Vitrines de hotéis e restaurantes parceiros (display)
- Segurança: validação de input, CORS, auth em booking
- Compliance LGPD

### 3.2 Fora do Escopo (v1)

- Booking de hotéis e restaurantes dentro da plataforma
- Pagamentos internacionais via Stripe
- Sistema de avaliações e reviews
- Mensagens entre turista e guia
- Dashboard analítico para guias
- Algoritmo de ranking por ML
- Arbitragem de disputas de reembolso
- Painel administrativo regional
- Tours multi-trecho ou multi-destino
- Seguro ou garantia de viagem
- White-label multi-marketplace

---

## 4. Requisitos Funcionais

### 4.1 Segurança (SEC) — Pré-requisito para Pagamento

> Estes requisitos são bloqueantes: nenhuma funcionalidade de pagamento pode entrar em produção sem que todos estejam implementados.

| ID | Requisito | Prioridade |
|----|-----------|------------|
| SEC-01 | Todas as rotas da API validam o payload de entrada com Zod antes de qualquer processamento; requisições malformadas retornam HTTP 400 com mensagem descritiva | Alta |
| SEC-02 | A origem permitida no CORS é configurada via variável de ambiente (ex: `CORS_ORIGIN`), não hardcoded; o plugin `@fastify/helmet` é registrado e ativo em todos os ambientes | Alta |
| SEC-03 | Os endpoints de criação, cancelamento e confirmação de reserva exigem token JWT válido; a identidade do tenant é verificada em cada operação para impedir acesso cross-tenant | Alta |
| SEC-04 | A plataforma disponibiliza página de política de privacidade (LGPD); o usuário autenticado pode solicitar exportação ou exclusão dos seus dados pessoais | Alta |

### 4.2 Autenticação e Cadastro (AUTH)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| AUTH-01 | Turista pode criar conta com e-mail e senha; após cadastro, acessa a plataforma com role CLIENTE | Alta |
| AUTH-02 | Guia pode criar conta informando CPF ou CNPJ; após cadastro, fica com status "aguardando aprovação" e não pode publicar roteiros | Alta |
| AUTH-03 | Admin pode visualizar guias pendentes, aprovar ou rejeitar cada cadastro; guia recebe notificação do resultado | Alta |

**Regras de negócio:**
- E-mail deve ser único por tenant
- CPF/CNPJ deve ser validado (formato e dígitos verificadores)
- Senha mínima de 8 caracteres
- Guia rejeitado pode resubmeter cadastro com dados corrigidos

### 4.3 Perfis de Guias (GUIDE)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| GUIDE-01 | Guia aprovado tem perfil público com: foto, nome, bio, especialidades e lista de regiões atendidas | Alta |
| GUIDE-02 | Guias com aprovação ativa exibem badge visual "Guia Verificado" no perfil e em todas as listagens | Média |
| GUIDE-03 | Guias podem ser vinculados a uma operadora ou empresa; o perfil da operadora agrupa os guias sob uma marca compartilhada | Média |
| GUIDE-04 | Guia pode adicionar portfólio de fotos de experiências ao próprio perfil | Média |

**Regras de negócio:**
- Perfil só é público após aprovação do admin
- Badge "Verificado" é removido automaticamente se aprovação for revogada
- Operadora é cadastrada pelo admin e associa guias manualmente

### 4.4 Roteiros e Pacotes (PKG)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| PKG-01 | Guia aprovado pode criar roteiro com: título, descrição, preço, nível de dificuldade (Fácil/Moderado/Difícil) e slots de saída com data e horário | Alta |
| PKG-02 | Múltiplos guias podem oferecer o mesmo roteiro (identificado por nome/categoria) com preços distintos; todos aparecem visíveis para comparação | Alta |
| PKG-03 | Guia define número mínimo e máximo de participantes por slot no momento da criação ou edição | Média |
| PKG-04 | Guia pode gerenciar o calendário de disponibilidade: adicionar novos slots, editar slots futuros e cancelar slots sem reservas confirmadas | Alta |

**Regras de negócio:**
- Slot com ao menos uma reserva CONFIRMED não pode ser cancelado sem tratativa manual
- Slot atingindo capacidade máxima muda status para FULL automaticamente
- Preço é fixo por slot; sem negociação dinâmica no v1

### 4.5 Descoberta e Busca (DISC)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| DISC-01 | Turista pode filtrar roteiros disponíveis por região; regiões são implementadas como tags de localização associadas aos roteiros | Alta |
| DISC-02 | Turista pode selecionar um roteiro e ver múltiplos guias que o oferecem lado a lado, com preço, badge de verificação e disponibilidade de datas | Alta |
| DISC-03 | Turista pode buscar roteiros digitando nome do roteiro ou destino em campo de busca textual; resultados são exibidos em tempo real ou ao submeter | Alta |
| DISC-04 | A página inicial exibe listagem paginada de roteiros disponíveis, ordenada por relevância manual definida pelo admin | Alta |

**Regras de negócio:**
- Somente roteiros com ao menos um slot futuro OPEN aparecem na listagem
- Turista não autenticado pode navegar e buscar; autenticação exigida apenas ao reservar

### 4.6 Vitrines de Parceiros (STORE)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| STORE-01 | Admin pode cadastrar hotéis e restaurantes parceiros com nome, foto e descrição; parceiros são exibidos em destaque nos roteiros relacionados (display only — sem booking) | Baixa |

### 4.7 Reservas (BOOK)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| BOOK-01 | Turista autenticado pode reservar um slot; a operação é executada em transação atômica que verifica capacidade disponível, impedindo overbooking em acessos simultâneos | Alta |
| BOOK-02 | Após aprovação do pagamento pelo gateway, a reserva transita automaticamente de PENDING para CONFIRMED sem intervenção manual | Alta |
| BOOK-03 | Turista pode cancelar uma reserva; o valor reembolsado é calculado automaticamente conforme política de antecedência definida pelo admin | Alta |

**Regras de negócio:**
- Reserva criada com status PENDING expira em 30 minutos sem pagamento
- Cancelamento até 48h antes: reembolso total
- Cancelamento entre 24h e 48h antes: reembolso parcial (definido pelo admin)
- Cancelamento em menos de 24h: sem reembolso
- Capacidade decrementada atomicamente na criação e restaurada no cancelamento

### 4.8 Pagamentos (PAY)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| PAY-01 | Turista pode pagar a reserva via PIX gerado pelo Mercado Pago; a confirmação de pagamento é processada via webhook e atualiza a reserva automaticamente | Alta |
| PAY-02 | Turista pode pagar a reserva com cartão de crédito (Mercado Pago) como alternativa ao PIX | Alta |
| PAY-03 | Após confirmação do pagamento, a plataforma calcula o valor líquido (valor total menos comissão) e registra o repasse devido ao guia | Alta |

**Regras de negócio:**
- PIX expira em 30 minutos; nova tentativa gera novo QR Code
- Comissão da plataforma: percentual configurável por admin (padrão a definir)
- Repasse não é instantâneo no v1: registrado e processado em lote ou manualmente
- Todas as operações financeiras usam precisão decimal (sem float)

---

## 5. Requisitos Não Funcionais

| Categoria | Requisito |
|-----------|-----------|
| **Segurança** | Autenticação JWT em todas as rotas protegidas; tokens com expiração configurável |
| **Segurança** | Isolamento multi-tenant: nenhuma query retorna dados de outro tenant |
| **Segurança** | Senhas armazenadas com hash bcrypt (custo mínimo 10) |
| **Consistência** | Operações de booking executadas em `prisma.$transaction` para garantir atomicidade |
| **Disponibilidade** | Deploy contínuo via Railway; downtime zero em deploys de rotina |
| **Compliance** | LGPD: dados pessoais exportáveis e deletáveis mediante solicitação |
| **Compliance** | CPF/CNPJ validados antes de persistir no banco |
| **Performance** | Listagem de roteiros paginada (máximo 20 itens por página) |
| **Internacionalização** | Interface em português; mensagens de erro da API em português |
| **Mobile** | Frontend responsivo (mobile-first); acesso primário estimado: 75% mobile |

---

## 6. Requisitos do Sistema (Infraestrutura)

| Componente | Tecnologia |
|------------|------------|
| API | Fastify 5 + TypeScript |
| ORM / Banco | Prisma 7 + PostgreSQL (Railway) |
| Frontend | Next.js 16.2 + React 19 (App Router) |
| Autenticação | JWT (@fastify/jwt) |
| Pagamentos | Mercado Pago SDK (PIX + cartão) |
| Validação | Zod 3.x |
| Monorepo | pnpm workspaces + Turborepo |
| Deploy | Railway (Nixpacks) |
| Segurança HTTP | @fastify/helmet + @fastify/cors |

---

## 7. Requisitos Diferidos (v2)

| ID | Requisito | Motivo do diferimento |
|----|-----------|----------------------|
| PAY-v2-01 | Pagamento via Stripe para turistas internacionais | Baixo volume inicial; complexidade de split payment |
| BOOK-v2-01 | Checkout multi-guia (carrinho com múltiplos roteiros) | Requer redesign de fluxo de pagamento |
| TRUST-v2-01 | Sistema de avaliações pós-roteiro | Dependência de dados históricos; necessita moderação |
| GUIDE-v2-01 | Nota média de reviews no perfil e listagens | Depende de TRUST-v2-01 |
| MSG-v2-01 | Mensagens entre turista e guia antes da confirmação | Requer infraestrutura de real-time (WebSocket) |
| ADMIN-v2-01 | Dashboard analítico para guias (receita, ocupação) | Prematura para MVP; volume insuficiente de dados |

---

## 8. Rastreabilidade — Requisitos × Fases de Desenvolvimento

| REQ-ID | Descrição resumida | Fase |
|--------|-------------------|------|
| SEC-01 | Validação Zod em todas as rotas | Fase 1 — Security Hardening |
| SEC-02 | CORS por env var + Helmet ativo | Fase 1 — Security Hardening |
| SEC-03 | Auth obrigatório em booking endpoints | Fase 1 — Security Hardening |
| SEC-04 | LGPD: exportação/exclusão de dados | Fase 1 — Security Hardening |
| AUTH-01 | Cadastro de turista (CLIENTE) | Fase 2 — User Access & Guide Onboarding |
| AUTH-02 | Cadastro de guia com CPF/CNPJ | Fase 2 — User Access & Guide Onboarding |
| AUTH-03 | Aprovação/rejeição de guia pelo admin | Fase 2 — User Access & Guide Onboarding |
| GUIDE-01 | Perfil público do guia | Fase 2 — User Access & Guide Onboarding |
| GUIDE-02 | Badge "Guia Verificado" | Fase 2 — User Access & Guide Onboarding |
| GUIDE-03 | Agrupamento por operadora | Fase 2 — User Access & Guide Onboarding |
| GUIDE-04 | Portfólio de fotos | Fase 2 — User Access & Guide Onboarding |
| PKG-01 | Criação de roteiro com slots | Fase 3 — Itineraries & Availability |
| PKG-02 | Multi-guia por roteiro com preços distintos | Fase 3 — Itineraries & Availability |
| PKG-03 | Limites de grupo por slot | Fase 3 — Itineraries & Availability |
| PKG-04 | Gestão de calendário de disponibilidade | Fase 3 — Itineraries & Availability |
| DISC-01 | Filtro por região (tags) | Fase 4 — Marketplace Discovery |
| DISC-02 | Comparação de guias lado a lado | Fase 4 — Marketplace Discovery |
| DISC-03 | Busca textual por roteiro/destino | Fase 4 — Marketplace Discovery |
| DISC-04 | Listagem paginada na home | Fase 4 — Marketplace Discovery |
| STORE-01 | Vitrines de parceiros (display only) | Fase 4 — Marketplace Discovery |
| BOOK-01 | Reserva com anti-overbooking transacional | Fase 5 — Booking & Payments |
| BOOK-02 | Confirmação automática pós-pagamento | Fase 5 — Booking & Payments |
| BOOK-03 | Cancelamento com política de reembolso | Fase 5 — Booking & Payments |
| PAY-01 | Pagamento PIX via Mercado Pago | Fase 5 — Booking & Payments |
| PAY-02 | Pagamento com cartão de crédito | Fase 5 — Booking & Payments |
| PAY-03 | Cálculo e registro de repasse ao guia | Fase 5 — Booking & Payments |

---

*Documento gerado em 18/04/2026 — baseado no roadmap e pesquisa de domínio do projeto.*
