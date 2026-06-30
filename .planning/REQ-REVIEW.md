# REQ-REVIEW.md — Revisão Canônica de Requisitos
## Turismo Capivara (CAPI)

> **Origem:** Revisão completa baseada no documento de requisitos funcionais, não-funcionais e boas práticas do MVP  
> **Data:** 2026-06-30  
> **Escopo:** MVP v2.0 — todas as seções cruzadas com o estado atual do codebase e roadmap

---

## Legenda de Status

| Status | Significado |
|--------|------------|
| ✅ | Implementado — existe no código ou em fase concluída |
| ⚠️ | Parcial — existe mas incompleto, com limitações conhecidas ou em fase ainda não executada |
| ❌ | Ausente — não implementado, sem fase planejada |
| 🔜 | Pós-MVP — decisão de escopo deliberada: fora do v2.0, entra no backlog |

---

## 1. RF — Requisitos Funcionais

### RF-01 — Cadastro de Guia

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| RF-01.1 | Guia informa destino e escolhe roteiro existente ou cria novo | ✅ | Phase 14 — Gestão de Conteúdo | Criação e edição de destinos e roteiros via painel |
| RF-01.2 | Sistema impede criação de roteiros duplicados | ❌ | Sem implementação nem fase planejada | Sem validação de unicidade por título/destino/guia |
| RF-01.3 | Editor com descrição de experiências e imagens | ✅ | Phase 14 — fotos + lista de experiências | Upload via R2/Cloudflare; experiências como lista de texto |
| RF-01.4 | Campo de itinerário estruturado (passo a passo do roteiro) | ⚠️ | Phase 14 parcial | Descrição livre existe; campo de itinerário sequencial (dia 1, dia 2…) não está no modelo de dados atual |
| RF-01.5 | Turista visualiza e seleciona roteiros facilmente no marketplace | ✅ | Marketplace público v1.0 | Listagem pública de destinos e roteiros disponível |

---

### RF-02 — Agenda de Reservas

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| RF-02.1 | Guia gerencia datas disponíveis (slots) no painel | ✅ | v1.0 — modelo `DepartureSlot` | Criação, edição e remoção de slots via painel |
| RF-02.2 | Interface de calendário interativa para gestão de slots | ⚠️ | Sem requisito formalizado | Slots existem como lista; componente de calendário visual não está nos requisitos nem nas fases |
| RF-02.3 | Alerta automático ao guia quando vagas ficam baixas (email/SMS/WhatsApp) | ❌ | Sem implementação nem fase planejada | Nenhum trigger de alerta de capacidade implementado |
| RF-02.4 | Prevenção de conflitos de agendamento (anti-overbooking) | ✅ | Phase 16/17 — DATA-03, PAY-01 | Lock pessimista (`FOR UPDATE`) no slot durante criação de booking |

---

### RF-03 — Fluxo de Reserva

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| RF-03.1 | Turista seleciona destino e vê lista de guias disponíveis | ✅ | Marketplace v1.0 | Listagem pública por destino |
| RF-03.2 | Turista escolhe guia, vê roteiros e seleciona data | ✅ | Fluxo de booking v1.0 | Fluxo completo implementado |
| RF-03.3 | Guia recebe notificação de nova solicitação e pode aprovar/recusar | ✅ | NOTIF-01–04 (v1.1) + painel | Email ao guia em nova reserva; aprovação/recusa via painel |
| RF-03.4 | Após aprovação do guia: QR code PIX gerado para turista pagar | ✅ | Mercado Pago — Phase 16 (PAY-01/02) | Integração MP ativa; Phase 16 garante atomicidade |
| RF-03.5 | Notificação confirmatória enviada ao turista e ao guia após pagamento | ✅ | Emails transacionais v1.1 | Resend envia email de confirmação em ambos os lados |
| RF-03.6 | App retém comissão automaticamente e repassa saldo líquido ao guia após o serviço | 🔜 | Backlog pós-v2.0 | Repasse manual aceitável no volume inicial; comissão % definida, execução futura |

---

### RF-04 — Pós-Reserva (Pré-Viagem)

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| RF-04.1 | Guia notificado próximo à data para preparar o passeio (email de lembrete) | ❌ | Sem implementação nem fase planejada | Job de reminder não existe; apenas notificação de nova reserva |
| RF-04.2 | Canal WhatsApp Business API entre guia e turista para combinar detalhes | 🔜 | Fora de escopo v2.0 | "Chat turista↔guia — WhatsApp resolve no volume inicial" (decisão documentada) |
| RF-04.3 | LGPD: opt-in WhatsApp com registro de consentimento (timestamp, IP, texto) | 🔜 | Dependente de RF-04.2 | Entra junto com implementação do WhatsApp Business — pós-MVP |

---

### RF-05 — Feedback Pós-Viagem

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| RF-05.1 | Turista avalia guia com estrelas, comentários e fotos após a viagem | 🔜 | Backlog pós-v2.0 | "Reviews e avaliações — sem dados reais ainda" (decisão documentada) |
| RF-05.2 | Feedback protegido: exibição pública somente com consentimento do turista | 🔜 | Dependente de RF-05.1 | Requisito de LGPD para reviews — implementar junto |
| RF-05.3 | Avaliações vinculadas ao perfil do guia e influenciam sua reputação no marketplace | 🔜 | Dependente de RF-05.1 | Ranking/reputação por avaliação — pós-PMF |

---

## 2. RNF — Segurança e Acesso

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| RNF-SEC-01 | Isolamento de dados entre perfis de guia (princípio do menor privilégio) | ✅ | Phase 17 — SEC-03 | Handlers verificam `tenantId` antes de qualquer operação |
| RNF-SEC-02 | RBAC: turistas e guias com privilégios distintos | ✅ | v1.0 — roles ADMIN, ATENDENTE, CONDUTOR, CLIENTE | Middleware de autorização por role em todos os endpoints privados |
| RNF-SEC-03 | Autenticação via JWT + canais HTTPS | ✅ | v1.0 JWT; Railway HTTPS | JWT com expiração 7d (Phase 21 INFRA-03); TLS via Railway |
| RNF-SEC-04 | Dados pessoais criptografados em trânsito | ✅ | HTTPS Railway (TLS obrigatório) | Todo tráfego client↔API via HTTPS |
| RNF-SEC-05 | Dados pessoais criptografados em repouso no banco | ⚠️ | CPF hasheado (HMAC-SHA256) — v1.1 | Apenas CPF protegido; nome, email e telefone armazenados em plaintext; PostgreSQL Railway sem at-rest encryption explícita configurada |
| RNF-SEC-06 | LGPD: coletar apenas dados estritamente necessários | ⚠️ | CPF hasheado implementado | Auditoria formal de campos coletados não realizada; não há processo de revisão de minimização de dados |
| RNF-SEC-07 | LGPD: consentimento claro e explícito para cada uso de dado pessoal | ❌ | Sem implementação nem fase planejada | Nenhum fluxo de consentimento na UI; aceite de política não registrado |
| RNF-SEC-08 | LGPD: exclusão de dados do usuário a pedido (direito ao esquecimento) | ❌ | Sem implementação nem fase planejada | Sem endpoint de solicitação de exclusão; sem processo de anonimização de dados históricos |

---

## 3. RNF — Proteção de Dados (LGPD)

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| RNF-LGPD-01 | PII armazenada com anonimização/tokenização onde possível | ⚠️ | CPF hasheado (HMAC-SHA256) — v1.1 | Apenas CPF protegido; nome, email e telefone em plaintext; `ANONYMIZATION_SALT` validado na Phase 21 |
| RNF-LGPD-02 | Logs de acesso a dados pessoais (audit log de PII) | ❌ | Sem implementação nem fase planejada | Nenhum registro de quem acessou quais dados pessoais e quando |
| RNF-LGPD-03 | Registro de consentimento com timestamp, IP e texto aceito | ❌ | Sem implementação nem fase planejada | LGPD Art. 7 exige comprovação de consentimento — ausência é risco legal |
| RNF-LGPD-04 | Opt-out funcional para canais de comunicação | 🔜 | Dependente de RF-04.2 (WhatsApp) | Email opt-out não formalizado; WhatsApp fora de escopo v2.0 |
| RNF-LGPD-05 | Acesso interno a dados sensíveis segue necessidade mínima | ⚠️ | RBAC existe | Controle de acesso por role implementado; auditoria de acesso interno a PII não implementada |
| RNF-LGPD-06 | Política de privacidade exibida no cadastro com checkbox de aceite explícito | ❌ | Sem implementação nem fase planejada | Onboarding atual não exibe política nem coleta aceite formal |
| RNF-LGPD-07 | Todo acesso à base de dados de usuários deve ser auditado (audit log) | ❌ | Sem implementação nem fase planejada | Sem trigger de auditoria no banco nem log de queries a tabelas de PII |

---

## 4. INFRA — Infraestrutura e Operações

### INFRA-OBS — Observabilidade e Rastreabilidade

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| INFRA-01 | Correlation ID (X-Request-ID) propagado em toda requisição HTTP | ⚠️ | Phase 21 INFRA-06 — planejada, não executada | `genReqId` + header `X-Request-Id` previstos na Phase 21; não está no código atual |
| INFRA-02 | Tracing distribuído com OpenTelemetry/Jaeger (Trace ID automático) | ❌ | Sem plano em nenhuma fase | Não está no roadmap v2.0; Sentry cobre erros mas não tracing de latência entre serviços |
| INFRA-03 | Logs estruturados JSON com timestamp, nível, request ID, usuário, serviço | ⚠️ | Phase 21 INFRA-06 — planejada, não executada | Fastify gera JSON por padrão; campos completos (reqId, usuário) dependem da Phase 21 |
| INFRA-04 | Em erros: stack trace completo + contexto (input, ID da transação) nos logs | ⚠️ | Sentry (v1.1) captura exceções | Sentry tem stack trace; logs de rota sem contexto padronizado (input do usuário, ID da transação) |

### INFRA-HEALTH — Health Checks

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| INFRA-05 | Endpoint `/health` com status detalhado (DB, dependências, CPU/memória) | ⚠️ | Phase 21 INFRA-04 — planejada | Implementação prevista retorna `{ db: 'ok/unreachable' }`; sem CPU/memória/dependências externas |
| INFRA-06 | Monitoramento automático sonda `/health` periodicamente e direciona tráfego | ⚠️ | Railway health check + Phase 23 QA-02 | Railway pode configurar health check; alerta formalizado na Phase 23 — ambos não executados |

### INFRA-DB — Query Logging e Performance de Banco

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| INFRA-07 | Log de todas as queries com tempo de execução | ❌ | Sem implementação nem fase planejada | Prisma tem `log: ['query']` configurável mas não está ativo |
| INFRA-08 | Slow query log / APM para identificar gargalos de banco | ❌ | Sem implementação nem fase planejada | Sem ferramenta de APM configurada; Railway não expõe slow query log nativamente |

### INFRA-CACHE — Cache e Métricas

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| INFRA-09 | Cache (Redis/Memcached) para dados lidos com frequência | 🔜 | Fora de escopo v2.0 | Volume inicial não justifica; `ioredis` será removido na Phase 21 INFRA-01 |
| INFRA-10 | Monitoramento de hits/misses do cache (Prometheus) | 🔜 | Dependente de INFRA-09 | Implementar junto com cache — pós-v2.0 |

### INFRA-METRICS — Métricas de Performance

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| INFRA-11 | Coleta de métricas de sistema (latência, CPU, memória, disco) via Prometheus/Grafana | ❌ | Sem plano em nenhuma fase | Projeto usa Sentry (erros) + Railway (métricas básicas); sem Prometheus/Grafana |
| INFRA-12 | Dashboards em tempo real de performance da aplicação | ❌ | Sem plano em nenhuma fase | Railway oferece métricas de infra básicas; sem dashboard customizado de aplicação |
| INFRA-13 | Alertas customizáveis para anomalias (latência, erros excessivos, saturação) | ⚠️ | Sentry (v1.1) + Phase 23 QA-02 | Sentry alerta em erros; Phase 23 adiciona uptime alert — sem alertas de latência ou CPU |

### INFRA-CICD — Testes e Deploy

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| INFRA-14 | Testes E2E automatizados dos fluxos críticos em cada release | ⚠️ | Phase 23 QA-01 — planejada, não executada | Playwright nos 3 fluxos críticos; bloqueia deploy se falha — não executado ainda |
| INFRA-15 | Testes E2E integrados ao pipeline CI/CD | ⚠️ | Phase 23 QA-01 — planejada, não executada | Mesmo que INFRA-14 — faz parte do mesmo plano |
| INFRA-16 | Deploy seguro com blue/green ou canary deployment | ❌ | Sem plano em nenhuma fase | Railway não suporta blue/green nativamente; sem estratégia alternativa definida |
| INFRA-17 | Rollback automático baseado em falhas de health check | ❌ | Sem plano em nenhuma fase | Railway faz redeploy manual; sem rollback automático configurado |
| INFRA-18 | Segredos e chaves em cofre seguro (Vault/Secrets Manager) com rotação periódica | ⚠️ | Railway env vars em uso | Railway protege variáveis de ambiente; sem cofre dedicado nem política de rotação documentada |

---

## 5. ARQ — Arquitetura Backend e Integrações

### ARQ-API — Estrutura de Serviços

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| ARQ-01 | Arquitetura API-first com RESTful APIs (JSON) | ✅ | Fastify 5 — `apps/api/src/modules/` | Módulos independentes: auth, bookings, packages, tenants, destinations |
| ARQ-02 | Endpoints críticos idempotentes (login, reservar, aprovar, gerar QR) | ⚠️ | Phase 12.1 — POST /bookings | Idempotência implementada em bookings; demais endpoints sem verificação formal de idempotência |
| ARQ-03 | Documentação de endpoints (Swagger/OpenAPI) | ❌ | Sem implementação nem fase planejada | Zero documentação gerada; onboarding de devs e auditoria dependem de leitura direta do código |
| ARQ-04 | Serviços comunicam-se via APIs bem definidas com fronteiras claras | ✅ | Monólito modular Fastify | Fronteiras por módulo; sem acoplamento direto entre módulos |

### ARQ-DB — Banco de Dados

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| ARQ-05 | Banco relacional com isolamento por tenant (`tenantId`) | ✅ | PostgreSQL + Prisma 7; `tenantId` em todas as entidades | Schema único com discriminação por coluna |
| ARQ-06 | Queries sempre filtradas pelo usuário autenticado (sem vazamento cross-tenant) | ✅ | Phase 17 SEC-03 | Handlers verificam pertencimento ao tenant antes de agir |
| ARQ-07 | Permissões de consulta derivadas do JWT autenticado | ✅ | Middleware de autenticação v1.0 | `authenticate` hook em todos os endpoints privados |

### ARQ-PAY — Integração de Pagamentos

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| ARQ-08 | QR code PIX gerado via Mercado Pago ao aprovar reserva | ✅ | Integração MP — v1.0 + Phase 16 | Flow: aprovação → MP API → QR code → turista |
| ARQ-09 | Webhook confirma pagamento → saldo creditado ao guia automaticamente | ⚠️ | Phase 17 SEC-04 — deduplicação implementada | Webhook com dedup implementado; crédito automático ao guia não existe (repasse manual) |
| ARQ-10 | Booking + PIX em transação atômica (falha no MP → zero persistência) | ⚠️ | Phase 16 PAY-01/02 — planejada, não executada | Sem atomicidade hoje; MP pode falhar após booking persistido |
| ARQ-11 | Registro de transações financeiras para auditoria e compliance | ⚠️ | Bookings registrados no banco | Bookings existem como registro; log de transações financeiras com campos de auditoria (valor, comissão, timestamp MP) não formalizado |
| ARQ-12 | Retenção automática de comissão da plataforma por reserva confirmada | 🔜 | Backlog pós-v2.0 | Modelo de monetização definido (comissão %); implementação futura |

### ARQ-NOTIF — Notificações

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| ARQ-13 | Email transacional em todo o ciclo de reserva | ✅ | NOTIF-01–04 — v1.1 Phase 9 via Resend | Confirmação, aprovação, cancelamento e expiração cobertos |
| ARQ-14 | Push notification / notificação in-app para guia em nova reserva | ❌ | Sem implementação nem fase planejada | Apenas email; sem push notification web ou mobile |
| ARQ-15 | WhatsApp Business API para notificações transacionais | 🔜 | Fora de escopo v2.0 | Decisão documentada: volume inicial não justifica |
| ARQ-16 | Mensagens WhatsApp somente após opt-in LGPD do usuário | 🔜 | Dependente de ARQ-15 | Implementar junto com WhatsApp Business — pós-MVP |
| ARQ-17 | Email com retry em falha de entrega (backoff exponencial) | ⚠️ | Phase 22 EMAIL-01 — planejada, não executada | `sendEmailWithRetry()` com 3 tentativas + backoff 500ms/1s/2s previsto; hoje é fire-and-forget |

### ARQ-CACHE — Cache e Performance

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| ARQ-18 | Cache (Redis) para dados lidos com frequência (ex: roteiros por destino) | 🔜 | Fora de escopo v2.0 | `ioredis` removido na Phase 21; cache simples não necessário no volume atual |
| ARQ-19 | Invalidação de cache quando guia atualiza roteiros | 🔜 | Dependente de ARQ-18 | Implementar estratégia de invalidação junto com o cache — pós-v2.0 |

---

## 6. UX — Frontend e UI/UX

### UX-FLUXOS — Fluxos do Guia e Turista

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| UX-01 | Painel do guia com acesso rápido a perfil, roteiros e reservas | ✅ | Phase 11–14 — painel completo | SidebarNav com seções: Reservas, Locais, Roteiros, Configurações |
| UX-02 | Criação/edição de roteiro simples com preview antes de publicar | ⚠️ | Phase 14 — criação implementada | Formulário de criação existe; preview "como o turista vê" não formalizado como requisito |
| UX-03 | Homepage com busca/seleção de destino como foco principal | ✅ | Phase 20 — 6 destinos + filtro APPROVED | Grid de destinos em destaque; apenas destinos APPROVED visíveis |
| UX-04 | Filtros específicos de roteiro: duração, dificuldade, faixa etária, amenidades | ❌ | Sem implementação nem fase planejada | Filtros atuais apenas por destino/região; atributos estruturados não existem no modelo de dados |
| UX-05 | Cards de roteiro com informações detalhadas (duração, nível, público-alvo) | ⚠️ | Cards existem; campos ausentes no modelo | Modelo `Package` não tem campos `duration`, `difficulty`, `ageGroup` — limitação de dados, não de UI |
| UX-06 | Mapa interativo na página de detalhe do roteiro | ❌ | Sem implementação nem fase planejada | Sem integração de mapas (Google Maps, Mapbox) em nenhuma fase |
| UX-07 | Foto do guia + depoimentos visíveis na página do roteiro (elemento de confiança) | ⚠️ | Foto do tenant existe | Foto da operadora/guia exibida; depoimentos dependem de RF-05 (avaliações — pós-MVP) |

### UX-DESIGN — Design Responsivo e Intuitivo

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| UX-08 | Design responsivo mobile-first em toda a aplicação | ✅ | Phase 11–13 — tokens CSS, touch targets 44px, card layout | `100dvh`, `clamp()`, card layout responsivo implementados |
| UX-09 | CTAs destacados ("Reservar agora") com hierarquia visual clara | ✅ | Phase 11 — brand CAPI, botões primários | Botões primários com cor e peso visual definidos via tokens |
| UX-10 | Componente de calendário para escolha de data com disponibilidade sugerida | ⚠️ | Seleção de data existe como input | Seleção de data funciona; calendário visual interativo com slots disponíveis destacados não implementado |
| UX-11 | Avaliações do guia visíveis na página de detalhe do roteiro | 🔜 | Dependente de RF-05 — backlog pós-v2.0 | Sistema de reviews não existe; entra junto com feedback pós-viagem |

### UX-AUTH — Autenticação e Perfil

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| UX-12 | UX de login/cadastro com validação clara de erros inline | ✅ | Phase 12 — login global `/login` | Email lookup com feedback de erro; onboarding com validação de campos |
| UX-13 | Guia preenche perfil completo com foto e descrição | ✅ | Phase 14 — upload de foto + conteúdo do tenant | Upload via R2; descrição e dados do tenant editáveis |
| UX-14 | Validação de número de celular do turista (para WhatsApp) | 🔜 | Dependente de ARQ-15 (WhatsApp fora de escopo) | Implementar junto com WhatsApp Business |
| UX-15 | Validação de email do turista para notificações | ✅ | Email coletado no booking; confirmação via Resend | Email obrigatório no BookingForm; confirmação transacional enviada |
| UX-16 | QR code PIX exibido visualmente em tela após aprovação com instruções | ⚠️ | Phase 18 UX-02 — planejada, não executada | QR visual SVG via `react-qr-code` previsto na Phase 18; hoje apenas código alfanumérico |
| UX-17 | Countdown regressivo do PIX visível na tela de confirmação | ⚠️ | Phase 18 UX-01 — planejada, não executada | Timer MM:SS previsto na Phase 18; não existe hoje |

### UX-SUPORTE — Feedback e Suporte

| ID | Requisito | Status | Referência | Observação |
|----|-----------|--------|------------|------------|
| UX-18 | Turista deixa avaliação pós-viagem de forma fácil | 🔜 | Backlog pós-v2.0 — RF-05 | Dependente do sistema de reviews |
| UX-19 | Canal de suporte para turista reportar problemas | ❌ | Sem implementação nem fase planejada | Sem formulário de suporte, chat ou link para contato disponível ao turista |
| UX-20 | Política de cancelamento exibida claramente no fluxo de reserva | ⚠️ | Cancelamento existe no fluxo | Cancelamento funciona; prazo/política de reembolso não estão formalizados na UI do turista |

---

## 7. Gap Analysis — Tabela Consolidada

### 🔴 Críticos — Risco Legal ou Bloqueador de Receita

| ID | Descrição | Tipo |
|----|-----------|------|
| RNF-SEC-07 | Consentimento LGPD: sem fluxo de aceite na UI | ❌ Ausente |
| RNF-SEC-08 | Direito ao esquecimento: sem endpoint de exclusão de dados | ❌ Ausente |
| RNF-LGPD-03 | Registro de consentimento com timestamp e IP: não existe | ❌ Ausente |
| RNF-LGPD-06 | Política de privacidade com checkbox no cadastro: não existe | ❌ Ausente |
| ARQ-10 | Booking + PIX não atômico: falha no MP pode criar booking órfão | ⚠️ Parcial |
| UX-16 | QR code PIX sem renderização visual: turista vê código alfanumérico | ⚠️ Parcial |
| UX-17 | Sem countdown PIX: turista não sabe quanto tempo tem para pagar | ⚠️ Parcial |

### 🟡 Importantes — Impacto Direto na Experiência do Usuário

| ID | Descrição | Tipo |
|----|-----------|------|
| RF-02.3 | Alerta de vagas baixas ao guia: não implementado | ❌ Ausente |
| RF-04.1 | Reminder ao guia próximo à data do passeio: não implementado | ❌ Ausente |
| UX-04 | Filtros de roteiro (duração, dificuldade, faixa etária): não existem | ❌ Ausente |
| UX-05 | Campos de atributos no modelo de roteiro (duration, difficulty, ageGroup) | ⚠️ Parcial |
| UX-19 | Canal de suporte ao turista: não existe | ❌ Ausente |
| UX-20 | Política de cancelamento formalizada na UI do turista | ⚠️ Parcial |
| ARQ-03 | Swagger/OpenAPI: zero documentação gerada | ❌ Ausente |
| ARQ-17 | Email fire-and-forget: falha silenciosa, sem retry | ⚠️ Parcial |

### 🟢 Maturidade Técnica — Boas Práticas sem Impacto Imediato

| ID | Descrição | Tipo |
|----|-----------|------|
| RF-01.2 | Deduplicação de roteiros: sem validação de unicidade | ❌ Ausente |
| RNF-LGPD-02 | Logs de acesso a PII (audit log) | ❌ Ausente |
| RNF-LGPD-07 | Audit log de queries a tabelas de usuários | ❌ Ausente |
| INFRA-02 | OpenTelemetry/tracing distribuído | ❌ Ausente |
| INFRA-07 | Query logging com tempo de execução (Prisma log) | ❌ Ausente |
| INFRA-08 | Slow query log / APM | ❌ Ausente |
| INFRA-11 | Prometheus/Grafana para métricas de performance | ❌ Ausente |
| INFRA-12 | Dashboards de performance em tempo real | ❌ Ausente |
| INFRA-16 | Blue/green ou canary deployment | ❌ Ausente |
| INFRA-17 | Rollback automático baseado em health check | ❌ Ausente |
| ARQ-14 | Push notifications para guia em nova reserva | ❌ Ausente |
| UX-06 | Mapa interativo na página de detalhe do roteiro | ❌ Ausente |
| RNF-SEC-05 | At-rest encryption para PII além do CPF | ⚠️ Parcial |

---

## 8. Backlog Priorizado

> Itens já em fases planejadas (Phase 16, 18, 21, 22, 23) têm fase indicada.  
> Itens novos (sem fase) precisam de nova fase ou inserção em fase existente.

### P1 — Resolver antes de qualquer usuário real em produção

| # | Item | Fase Sugerida | Esforço | IDs |
|---|------|---------------|---------|-----|
| 1 | Consentimento LGPD na UI: checkbox + política de privacidade no onboarding | Nova fase — LGPD Compliance | M | RNF-SEC-07, RNF-LGPD-06 |
| 2 | Registro de consentimento no banco (timestamp, IP, texto aceito) | Nova fase — LGPD Compliance | S | RNF-LGPD-03 |
| 3 | Endpoint de exclusão de dados a pedido (direito ao esquecimento) | Nova fase — LGPD Compliance | M | RNF-SEC-08 |
| 4 | Booking + PIX atômico: falha no MP não persiste booking | Phase 16 (executar) | M | ARQ-10, PAY-01/02 |
| 5 | QR code PIX visual (SVG) na tela de confirmação | Phase 18 (executar) | S | UX-16, UX-02 |
| 6 | Countdown regressivo do PIX em MM:SS | Phase 18 (executar) | S | UX-17, UX-01 |
| 7 | Email com retry e backoff exponencial (`sendEmailWithRetry`) | Phase 22 (executar) | S | ARQ-17, EMAIL-01 |

### P2 — Qualidade do produto e experiência do usuário

| # | Item | Fase Sugerida | Esforço | IDs |
|---|------|---------------|---------|-----|
| 8 | Correlation ID em logs + header X-Request-Id | Phase 21 (executar) | S | INFRA-01, INFRA-06 |
| 9 | Testes E2E Playwright (3 fluxos críticos) integrados ao CI/CD | Phase 23 (executar) | L | INFRA-14, INFRA-15, QA-01 |
| 10 | Campos de atributos no modelo de roteiro: `duration`, `difficulty`, `ageGroup` | Nova fase — Enriquecimento de Roteiro | M | UX-05, RF-01.4 |
| 11 | Filtros de roteiro na homepage: duração, dificuldade, faixa etária | Junto com #10 | M | UX-04 |
| 12 | Reminder email ao guia próximo à data do passeio (D-1 ou D-2) | Inserir na Phase 22 ou nova fase | S | RF-04.1 |
| 13 | Swagger/OpenAPI: documentação gerada automaticamente dos endpoints | Inserir na Phase 21 | S | ARQ-03 |
| 14 | Política de cancelamento formalizada na UI do turista | Phase 18 ou nova fase | S | UX-20 |
| 15 | Alerta ao guia quando vagas do slot ficam abaixo de limite (email) | Nova fase | S | RF-02.3 |
| 16 | Canal de suporte ao turista (link/email/formulário na UI) | Nova fase | S | UX-19 |

### P3 — Maturidade técnica (sem urgência operacional)

| # | Item | Fase Sugerida | Esforço | IDs |
|---|------|---------------|---------|-----|
| 17 | Deduplicação de roteiros por título + guia + destino | Inserir em fase existente | S | RF-01.2 |
| 18 | Push notifications web para guia em nova reserva | Nova fase pós-v2.0 | M | ARQ-14 |
| 19 | Audit log de acesso a dados pessoais (PII) | Nova fase — LGPD Compliance (junto com P1) | M | RNF-LGPD-02, RNF-LGPD-07 |
| 20 | Query logging com tempo de execução (Prisma `log: ['query']`) | Inserir na Phase 21 | S | INFRA-07 |
| 21 | Mapa interativo na página de detalhe do roteiro | Nova fase pós-v2.0 | M | UX-06 |
| 22 | At-rest encryption para PII além do CPF | Nova fase pós-v2.0 | L | RNF-SEC-05 |
| 23 | Prometheus/Grafana para métricas de latência e saturação | Nova fase pós-v2.0 | L | INFRA-11, INFRA-12 |
| 24 | OpenTelemetry/Jaeger para tracing distribuído | Nova fase pós-v2.0 | L | INFRA-02 |
| 25 | Blue/green deployment ou rollback automático via Railway | Nova fase pós-v2.0 | L | INFRA-16, INFRA-17 |
| 26 | Cofre de segredos (Vault/Secrets Manager) com rotação periódica | Nova fase pós-v2.0 | L | INFRA-18 |
| 27 | Slow query log / APM para gargalos de banco | Nova fase pós-v2.0 | M | INFRA-08 |

---

## Resumo Executivo

| Categoria | ✅ | ⚠️ | ❌ | 🔜 |
|-----------|----|----|----|----|
| RF — Funcionais | 8 | 2 | 3 | 5 |
| RNF — Segurança | 4 | 2 | 2 | 0 |
| RNF — LGPD | 0 | 2 | 4 | 1 |
| INFRA — Operações | 0 | 8 | 7 | 2 |
| ARQ — Arquitetura | 6 | 4 | 2 | 4 |
| UX — Frontend | 7 | 6 | 4 | 3 |
| **Total** | **25** | **24** | **22** | **15** |

> **Principais conclusões:**
> 1. **LGPD é o maior risco legal** — 4 itens ausentes críticos sem nenhuma fase planejada (consentimento, exclusão de dados, registro de aceite, política de privacidade)
> 2. **Phases 16, 18, 21, 22, 23 precisam ser executadas** — 13 itens ⚠️ já estão planejados mas não executados; resolvê-los elimina os gaps mais críticos
> 3. **Maturidade operacional é o maior gap técnico** — Prometheus, OpenTelemetry, blue/green e audit logs são P3 (sem urgência), mas representam débito técnico real
> 4. **Modelo de dados de roteiro precisa evoluir** — campos `duration`, `difficulty`, `ageGroup` ausentes limitam filtros de descoberta e qualidade do marketplace
