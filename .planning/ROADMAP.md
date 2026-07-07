# Roadmap — Turismo Capivara

## Milestones Concluídos

- **v1.0 MVP** (2026-05-13) — Auth multi-tenant, guias verificados, roteiros, discovery, reservas + PIX. Phases 1–6.
- **v1.1 Launch Readiness** (2026-05-26) — Rate limiting, Sentry, onboarding autônomo de operadoras, emails transacionais, expiração de bookings, self-service do turista. Phases 7–10. → [Arquivo](milestones/v1.1-ROADMAP.md)

---

## v1.2 — UI/UX Polish + Guia Experience

**Goal:** App mobile-first com login global sem slug, UI/estilos unificados, painel do guia totalmente responsivo, e gestão de conteúdo de roteiros e destinos.

### Phases

- [x] **Phase 11: Frontend Polish** — Navegação, tokens CSS consolidados, dead links removidos, brand CAPI unificada (2026-06-01)
- [x] **Phase 12: Login Global** — Portal `/login` sem slug com email lookup automático de tenant (completed 2026-06-02)
- [x] **Phase 12.1: Pre-Launch Hardening** — Idempotência em bookings, connection pool, smoke test PIX, onboarding de early adopters (completed 2026-06-03)
- [ ] **Phase 13: Painel Mobile + Feedback** — Card layout responsivo, touch targets, toasts, empty states, dialogs de confirmação
- [x] **Phase 14: Gestao de Conteudo** — Guia cria/edita destinos com fotos e enriquece roteiros com galeria e experiências (completed 2026-06-11)

---

## v1.3 — MVP Stability & Payment Integrity

**Goal:** Produto estável e seguro para uso real — pagamentos atômicos, multi-tenant blindado, checkout UX completo, confiabilidade operacional e polimento público.

### Phases

- [ ] **Phase 16: Integridade de Pagamento** — PIX atômico, validação de MP_ACCESS_TOKEN, algoritmo de CPF, polling de status, lock de slot
- [x] **Phase 17: Segurança e Dados** — Rate limit cancel-self, token opaco, isolamento multi-tenant, dedup de webhook, liberação de slot, aprovação de tenant, validação de data de slot
- [ ] **Phase 18: UX do Checkout** — Countdown PIX, QR code visual, link minha-reserva, loading state, proteção PII
- [ ] **Phase 19: Confiabilidade Operacional** — Job de expiração PIX, validação R2, confiabilidade de email, toast provider global, badge de status de destino
- [ ] **Phase 20: Polimento e Dados Públicos** — Home com mais destinos, filtro APPROVED, erro de tenant PENDING, terminologia, paginação super-admin

---

## Phase Details

### Phase 11: Frontend Polish
**Goal**: A interface pública e o painel usam um sistema visual coerente — tokens CSS, brand CAPI consistente, e navegação sem links mortos
**Depends on**: Nothing (pure frontend, no API changes)
**Requirements**: NAV-01, NAV-02, STYLE-01, STYLE-02, STYLE-03, STYLE-04, STYLE-05, AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05
**Success Criteria** (what must be TRUE):
  1. Todo `<title>` e meta description exibe "CAPI" — nenhuma página mostra "Serra da Capivara — Patrimônio Mundial UNESCO"
  2. Back button aparece em todas as páginas exceto homepage, sem necessidade de usar o botão do browser
  3. Transições entre rotas ocorrem sem flash branco visível
  4. Nenhum link na navegação pública aponta para página inexistente — Blog e links de redes sociais removidos ou desabilitados
  5. ConversionAnchor envia email para API real — "Cadastrado com sucesso" aparece somente após gravação confirmada
**Plans**: 5 plans
- [x] 11-01-PLAN.md — globals.css fixes + root layout CAPI title + delete legacy pages
- [x] 11-02-PLAN.md — BackButton component + placement on detail/sub-pages
- [x] 11-03-PLAN.md — Resend install + waitlist Server Action + BEM hex cleanup
- [x] 11-04-PLAN.md — PublicNav/BookingForm inline→Tailwind + hex→token cleanup
- [x] 11-05-PLAN.md — loading.tsx flash fix files + human visual verification
**UI hint**: yes

### Phase 12: Login Global
**Goal**: Qualquer usuário do sistema acessa `/login` sem precisar saber o slug da sua operadora
**Depends on**: Phase 11
**Requirements**: LOGIN-01, LOGIN-02, LOGIN-03, LOGIN-04, LOGIN-05
**Success Criteria** (what must be TRUE):
  1. Botão "Painel" na navegação pública leva para `/login` (não para `/onboarding` nem para `/{slug}/login`)
  2. Usuário digita seu email em `/login` e é redirecionado para o painel correto da sua operadora sem precisar saber o slug
  3. Link "Cadastrar agência ou guia" no form de login leva para `/onboarding`
  4. "Já tem conta?" no onboarding é um link funcional que leva para `/login`
  5. Usuário que esqueceu senha recebe link de redefinição por email e consegue criar nova senha
**Plans**: TBD

### Phase 12.1: Pre-Launch Hardening (INSERTED)
**Goal**: Blindar o produto contra 4 falhas conhecidas identificadas na auditoria antes de liberar acesso aos early adopters
**Depends on**: Phase 12
**Requirements**: HARDENING-01, HARDENING-02, HARDENING-03, HARDENING-04
**Success Criteria** (what must be TRUE):
  1. POST /bookings rejeita requisição duplicada com mesma idempotency key — retorna 200 com booking existente em vez de criar segundo booking
  2. DATABASE_URL no Railway inclui `?connection_limit=10&pool_timeout=2` — Prisma não excede limite de conexões sob carga simultânea
  3. Smoke test completo do fluxo PIX executado em produção: booking criado → QR gerado → webhook MP simulado → status CONFIRMED → email recebido
  4. Documento de boas-vindas para early adopters publicado: limitações conhecidas, política de cancelamento/reembolso e contato de suporte — disponível antes do primeiro acesso real
**Plans**: 3 plans
Plans:
- [x] 12.1-01-PLAN.md — Idempotência em POST /bookings (schema migration + lógica de dedup)
- [x] 12.1-02-PLAN.md — Connection pool DATABASE_URL no Railway (schema + config env)
- [x] 12.1-03-PLAN.md — Smoke test PIX em produção + página /acesso para early adopters

### Phase 13: Painel Mobile + Feedback
**Goal**: O painel do guia é completamente utilizável em celular — sem tabelas que cortam, com feedback claro para cada ação
**Depends on**: Phase 11
**Requirements**: MOBILE-01, MOBILE-02, MOBILE-03, MOBILE-04, MOBILE-05, FEEDBACK-01, FEEDBACK-02, FEEDBACK-03, FEEDBACK-04, FEEDBACK-05
**Success Criteria** (what must be TRUE):
  1. Em viewport 375px, reservas e roteiros exibem cards empilhados verticalmente — nenhuma tabela horizontal visível
  2. Clicar "Cancelar reserva" abre dialog de confirmação antes de chamar a API — ação não dispara imediatamente
  3. Toda ação no painel (confirmar, cancelar, criar) exibe toast de sucesso ou erro — nunca silencia o resultado
  4. Quando não há reservas ou roteiros, empty state com CTA aparece no lugar da lista vazia
  5. Erro inesperado de JS exibe tela de erro com botão "Tentar novamente" em vez de tela branca
**Plans**: TBD
**UI hint**: yes

### Phase 14: Gestao de Conteudo
**Goal**: Guia publica destinos e enriquece roteiros com fotos e experiências — tudo visível ao turista no marketplace
**Depends on**: Phase 12, Phase 13
**Requirements**: DEST-01, DEST-02, DEST-03, DEST-04, ROT-01, ROT-02, ROT-03
**Success Criteria** (what must be TRUE):
  1. Guia acessa painel, cria destino com nome, descrição, região e foto de capa, e vê o destino listado no painel
  2. Admin aprova destino criado por guia — destino passa a aparecer na página pública `/destinos`
  3. Guia edita e deleta apenas os destinos que ele criou
  4. Guia adiciona fotos e lista de experiências a roteiro existente — galeria e destaques aparecem na página pública do roteiro
**Plans**: TBD
**UI hint**: yes

### Phase 16: Integridade de Pagamento
**Goal**: O fluxo de reserva + PIX é atômico e seguro — sem bookings criados sem pagamento, sem CPFs inválidos, sem tokens MP ausentes em silêncio
**Depends on**: Phase 14
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, DATA-03
**Success Criteria** (what must be TRUE):
  1. API retorna 503 descritivo ao tentar criar booking quando `MP_ACCESS_TOKEN` está ausente — nunca usa mock silenciosamente em produção
  2. Se a chamada ao Mercado Pago falhar durante criação do booking, nenhuma linha de booking é persistida no banco de dados
  3. Lock pessimista no slot garante que duas requisições simultâneas para o mesmo slot resultam em no máximo uma reserva confirmada
  4. CPF com dígitos verificadores inválidos é rejeitado com erro 422 antes de qualquer chamada ao gateway de pagamento
  5. **UAT:** Fazer reserva real com `MP_ACCESS_TOKEN` configurado e verificar QR code PIX gerado; tentar reserva com CPF `111.111.111-11` e verificar rejeição 422; simular falha MP e confirmar que banco não tem booking criado; verificar que página de confirmação atualiza status automaticamente a cada 5s sem reload

### Phase 17: Segurança e Dados
**Goal**: O sistema resiste a abuso, isola tenants corretamente e mantém integridade dos dados de slot em todos os cenários de cancelamento e criação
**Depends on**: Phase 16
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, DATA-01, DATA-02, DATA-04
**Success Criteria** (what must be TRUE):
  1. Quarta tentativa de `cancel-self` dentro de 15 minutos pelo mesmo IP retorna 429 — as 3 primeiras passam normalmente
  2. Token de `cancel-self` é opaco e não derivado do `bookingId` — não é possível inferir o ID de outro booking a partir do token
  3. Tentativa de confirmar ou cancelar booking de outro tenant retorna 403, independente do JWT válido do usuário
  4. Cancelamento de reserva decrementa `bookedCount` do slot na mesma transação atômica — slot nunca fica com capacidade incorreta
  5. **UAT:** Tentar `cancel-self` 4x em 15min com mesmo IP e verificar rate limit no 4o; tentar confirmar reserva de tenant B estando autenticado como tenant A e verificar 403; criar slot com data de ontem e verificar rejeição; criar 2 bookings simultâneos no mesmo slot com capacidade 1 e verificar que apenas 1 persiste

### Phase 18: UX do Checkout
**Goal**: A página de confirmação de reserva é informativa, segura e funcional — turista sabe exatamente o que fazer e quando, sem expor dados pessoais
**Depends on**: Phase 16
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05
**Success Criteria** (what must be TRUE):
  1. Countdown regressivo em tempo real aparece na página de confirmação baseado em `expiresAt` — atualiza a cada segundo sem reload
  2. QR Code visual SVG é renderizado na página de confirmação a partir do código copia-e-cola (biblioteca `react-qr-code`)
  3. Página de confirmação exibe link "Consultar minha reserva" apontando para `/minha-reserva`
  4. Botão de submit do formulário de booking é desabilitado imediatamente após o primeiro clique e exibe spinner durante processamento — sem double submit
  5. **UAT:** Inspecionar DOM da página de confirmação e confirmar ausência de CPF, telefone ou qualquer PII sem autenticação; verificar countdown atualizando em tempo real; verificar QR code renderizando como SVG; clicar submit duas vezes rapidamente e verificar que apenas 1 requisição é feita
**Plans:** 2 plans
Plans:
- [ ] 18-01-PLAN.md — BookingForm: fix double-submit + spinner SVG (UX-04)
- [ ] 18-02-PLAN.md — ConfirmationClient: countdown + QR Code + link /minha-reserva (UX-01, UX-02, UX-03, UX-05)
**UI hint**: yes

### Phase 19: Confiabilidade Operacional
**Goal**: O sistema não falha silenciosamente — jobs rodam, variáveis ausentes geram erros claros, falhas de email são logadas, e o guia vê o status dos seus destinos
**Depends on**: Phase 17, Phase 18
**Requirements**: OPS-01, OPS-02, OPS-03, OPS-04, OPS-05
**Success Criteria** (what must be TRUE):
  1. Job horário marca bookings `PENDING` com `expiresAt` passado como `EXPIRED` e libera `bookedCount` do slot na mesma transação
  2. Tentativa de upload de foto quando variáveis R2 estão ausentes retorna 503 com mensagem descritiva — não retorna 500 genérico ou falha silenciosa
  3. Falha no envio de email é capturada com `await`, registrada no Sentry e não silencia o erro para o chamador
  4. Toast notifications em todo o painel usam um único provider global — nenhum componente reimplementa estado de toast inline
  5. **UAT:** Forçar expiração de booking PENDING (alterar `expiresAt` para passado no DB) e verificar que job da próxima hora o marca como EXPIRED e libera slot; remover variáveis R2 e tentar upload de foto e verificar 503 descritivo; verificar no Sentry que falha de email de teste aparece como evento
**UI hint**: yes
**Plans:** 4 plans
Plans:
- [ ] 19-01-PLAN.md — OPS-01/02/03: cronTime horário, 503 R2, Sentry em email de operadora
- [ ] 19-02-PLAN.md — OPS-04: Toaster no super-admin layout, remover toast inline
- [ ] 19-03-PLAN.md — OPS-05 backend: schema rejectionReason, service, endpoint + db push
- [ ] 19-04-PLAN.md — OPS-05 frontend: PainelDestinationCard com badge, data e motivo

### Phase 20: Polimento e Dados Públicos
**Goal**: A home pública é rica, destinos pendentes nunca vazam para turistas, e o super-admin opera sem limitações artificiais de paginação
**Depends on**: Phase 19
**Requirements**: POL-01, POL-02, POL-03, POL-04, POL-05
**Success Criteria** (what must be TRUE):
  1. Home pública exibe mais de 3 destinos com ordenação por relevância e link "Ver todos" apontando para `/destinos`
  2. Listagem pública `/destinos` e qualquer endpoint público retorna apenas destinos com `approvalStatus = APPROVED` — destinos PENDING nunca aparecem para turistas
  3. Turista que tenta reservar roteiro de operadora com `approvalStatus != APPROVED` vê mensagem de erro amigável (não 500)
  4. Item de navegação do editor do tenant tem nomenclatura que não confunde com a listagem pública de Destinos
  5. **UAT (smoke test end-to-end):** Smoke test completo — criar conta de turista, buscar destino na home, abrir roteiro, preencher formulário com CPF válido, pagar com PIX sandbox, verificar email de confirmação, verificar status CONFIRMED no painel do guia, verificar que super-admin consegue carregar mais de 50 operadoras na listagem; confirmar que destino PENDING não aparece em nenhuma rota pública
**UI hint**: yes
**Plans:** 4 plans
Plans:
- [ ] 20-01-PLAN.md — POL-01/02: home 6 destinos ordenados por recência + verificar filtro APPROVED em /destinos
- [ ] 20-02-PLAN.md — POL-04: renomear nav "Destinos" → "Locais" no painel do guia
- [ ] 20-03-PLAN.md — POL-03: mensagem inline de indisponibilidade para tenant não-APPROVED na página de reserva
- [ ] 20-04-PLAN.md — POL-05: paginação "Carregar mais" (20/lote) nas listas super-admin de destinos e operadoras

---

---

### Phase 21: Hardening de Infraestrutura
**Goal:** Eliminar débitos técnicos de infraestrutura zero-risco — dependências mortas, variáveis não validadas, configurações inseguras.
**Depends on:** Phase 17 (✅ Completo)
**Requirements:** INFRA-01 a INFRA-08
**Success Criteria:**
  1. `pnpm ls ioredis` vazio; `fix-plan06.js`, `.worktrees/`, `out/` removidos do git
  2. API encerra com erro descritivo se R2, ANONYMIZATION_SALT, RESEND_API_KEY ou EMAIL_FROM ausentes
  3. JWT expira em 7 dias; `PUT /auth/reset-password` sem CORS error no browser
  4. `GET /health` retorna `{ db: 'ok' }` em condição normal; HTTP 503 se DB offline
  5. Todo log de rota contém `reqId` UUID; header `X-Request-Id` na response
  6. Job de expiração executa às horas exatas (`:00`), não a cada minuto
  7. `pnpm test` executa `checkout.test.ts` e passa

**Plans:**
- [ ] 21-01-PLAN.md — Remover ioredis, fix-plan06.js, .worktrees, out/ (INFRA-01)
- [ ] 21-02-PLAN.md — Completar validateEnv: R2, ANONYMIZATION_SALT, RESEND, EMAIL_FROM (INFRA-02)
- [ ] 21-03-PLAN.md — app.ts: JWT expiresIn + CORS PUT + health check DB + connectionTimeout + genReqId (INFRA-03,04,05,06)
- [ ] 21-04-PLAN.md — Corrigir cron schedule `0 * * * *` + portar checkout.test.ts (INFRA-07,08)

---

### Phase 22: Confiabilidade de Email
**Goal:** Eliminar o padrão fire-and-forget — garantir que falhas de entrega sejam retentadas e logadas.
**Depends on:** Phase 21 (INFRA-02 valida RESEND_API_KEY)
**Requirements:** EMAIL-01
**Success Criteria:**
  1. `sendEmailWithRetry()` existe com 3 tentativas e backoff 500ms/1s/2s
  2. Zero ocorrências de `void resend.emails.send` no codebase
  3. Falha nas 3 tentativas → erro logado, sem throw não tratado

**Plans:**
- [ ] 22-01-PLAN.md — Implementar sendEmailWithRetry() e migrar todos os callers (EMAIL-01)

---

### Phase 23: Qualidade e Observabilidade
**Goal:** E2E nos 3 fluxos críticos, uptime monitoring, backup verificado, todos os endpoints privados auditados.
**Depends on:** Phase 20 (produto completo)
**Requirements:** QA-01, QA-02, QA-03, QA-04
**Success Criteria:**
  1. `pnpm e2e` passa: reserva→PIX→confirmação, login global, expiração de booking
  2. Falha nos fluxos bloqueia deploy no CI
  3. Railway health check em `/health` com alerta + Sentry error rate >5%
  4. Backup PostgreSQL Railway verificado; restore testado em staging
  5. Teste lista rotas Fastify e verifica `preHandler: [authenticate]` em todas as rotas privadas

**Plans:**
- [ ] 23-01-PLAN.md — Playwright E2E: 3 fluxos + CI integration (QA-01)
- [ ] 23-02-PLAN.md — Uptime alerts Railway + Sentry (QA-02)
- [ ] 23-03-PLAN.md — Backup verify + endpoint auth audit + security test (QA-03,QA-04)

---

## Progress

| Phase | Plans Complete | Status | Concluído |
|-------|----------------|--------|-----------|
| 11. Frontend Polish | 5/5 | Complete | 2026-06-01 |
| 12. Login Global | 3/3 | Complete | 2026-06-02 |
| 12.1. Pre-Launch Hardening | 3/3 | Complete | 2026-06-03 |
| 14. Gestão de Conteúdo | 8/8 | Complete | 2026-06-11 |
| 17. Segurança e Dados | 4/4 | Complete | 2026-06-22 |
| 21. Hardening de Infraestrutura | 0/4 | Not started | - |
| 22. Confiabilidade de Email | 0/1 | Not started | - |
| 19. Confiabilidade Operacional | 0/4 | Not started | - |
| 16. Integridade de Pagamento PIX | 0/3 | Not started | - |
| 18. UX do Checkout | 0/2 | Not started | - |
| 13. Painel Mobile + Feedback | 0/2 | Not started | - |
| 20. Polimento e Dados Públicos + SEO | 0/2 | Not started | - |
| 23. Qualidade e Observabilidade | 0/3 | Not started | - |

---

## v2.0 — Lançamento em Produção

**Goal:** Transformar o CAPI MVP em produto apto para primeiros clientes pagantes e apresentável a investidores-anjo — eliminando todos os débitos técnicos identificados na auditoria executiva de 2026-06-26.
**Origin:** Auditoria executiva MVP — Comitê de 7 especialistas, 12 pilares, 18 tasks de recuperação.
**Archive:** [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md) · [milestones/v2.0-REQUIREMENTS.md](milestones/v2.0-REQUIREMENTS.md)
**Requirements:** 37 (INFRA×8, EMAIL×1, PAY×4, OPS×5, UX×5, MOB×4, POL×4, SEO×2, QA×4)

### Phases

- [ ] **Phase 21: Hardening de Infraestrutura** — Remover ioredis/artefatos dev, completar validateEnv, JWT expiresIn, CORS PUT, health check DB, connectionTimeout, request ID, cron schedule, portar checkout tests
- [ ] **Phase 22: Confiabilidade de Email** — `sendEmailWithRetry()` com 3 tentativas + backoff exponencial; migrar todos os callers
- [ ] **Phase 16: Integridade de Pagamento PIX** — PIX atômico, validação MP_ACCESS_TOKEN, polling status, lock de slot *(do v1.3)*
- [ ] **Phase 19: Confiabilidade Operacional** — Job expiração com advisory lock, toast provider global, badge de status de destino *(do v1.3, plans existem)*
- [ ] **Phase 18: UX do Checkout** — Countdown PIX, QR code visual, link minha-reserva, double-submit, PII *(do v1.3)*
- [ ] **Phase 13: Painel Mobile + Feedback** — Card layout responsivo, touch targets 44px, toasts, estados vazios *(do v1.2)*
- [ ] **Phase 20: Polimento e Dados Públicos + SEO** — Home ≥6 destinos, filtro APPROVED, JSON-LD TouristAttraction/TourOperator *(do v1.3)*
- [ ] **Phase 23: Qualidade e Observabilidade** — E2E Playwright (3 fluxos), uptime alerts, backup verify, endpoint auth audit

---

## Backlog (pós-v2.0)

- Templates de email com design visual (NOTIF-05)
- Queue de email com retry via BullMQ/Redis
- Verificação de email no signup (ONBOARD-04)
- Links de recuperação com token por email (TOURIST-03)
- Reviews e avaliações de guias
- Repasse automático ao guia
- Aprovação individual de CONDUTOR pelo superadmin
- Multi-guia por roteiro (competição de preço)
- Comparação de guias lado a lado
- Integração com cartão de crédito

---

## v2.1 — Multi-Guide & Discovery

**Goal:** Transformar o CAPI de mono-guia para N:N — múltiplos guias por roteiro, descoberta cross-tenant de roteiros e guias por destino, widget de mapa interativo com parceiros e POIs.
**Origin:** Backlog estratégico — multi-guia por roteiro + páginas de discovery públicas por destino.
**Requirements:** 18 (SCH×4, SCHED×3, API×4, DISC×5, PANEL×2, MAP×4)

### Phases

- [x] **Phase 24: Schema & Data Migration** — PackageGuide N:N, DepartureSlot.guideId, durationMin/MaxHours, backfill de dados legados (completed 2026-07-04)
- [x] **Phase 25: API Endpoints & Conflict Logic** — Discovery cross-tenant, conflito de agenda transacional, validação de guia qualificado em slots
- [x] **Phase 26: Frontend Discovery Pages** — Páginas públicas /destinos/[slug]/roteiros, /guias, detalhe de roteiro e guia com links bidirecionais (completed 2026-07-07)
- [ ] **Phase 27: Partner Panel — Slot Creation** — Dropdown de guia qualificado no formulário de criação de slot, erro de conflito inline
- [ ] **Phase 28: Map Widget** — MapLibre GL JS + Maptiler + Overpass API com lazy load e graceful degradation

---

### Phase 24: Schema & Data Migration
**Goal**: Schema migrado para suportar N:N entre roteiros e guias, com backfill seguro de dados legados e validação de integridade crítica
**Depends on**: Phase 23
**Requirements**: SCH-01, SCH-02, SCH-03, SCH-04
**Success Criteria** (what must be TRUE):
  1. Tabela `PackageGuide` existe com `@@unique([packageId, guideId])` e `@@index`
  2. `DepartureSlot.guideId` existe (nullable) com `@@index([guideId, startsAt])`
  3. `TourPackage` tem `durationMinHours`, `durationMaxHours`, `bufferMinutes`
  4. Backfill: todo `TourPackage` com `conductorId` tem exatamente 1 row em `PackageGuide`
  5. Backfill: todo `DepartureSlot` tem `guideId` copiado do `conductorId` do pacote pai (onde não-nulo)
  6. `Tenant.@@index([destinationId])` existe
  7. 0 `DepartureSlot` futuros com `guideId=null` E reservas ativas (validação crítica passa)
**Plans**: 1/1 (implementado diretamente — commit 19a8823)
**Completed**: 2026-07-04 — schema + backfill + validação verificados no banco Railway (6/6 UAT pass)

### Phase 25: API Endpoints & Conflict Logic
**Goal**: Endpoints de discovery cross-tenant implementados e lógica de conflito de agenda transacional bloqueando sobreposição de guia
**Depends on**: Phase 24
**Requirements**: API-01, API-02, API-03, API-04, SCHED-01, SCHED-02, SCHED-03
**Success Criteria** (what must be TRUE):
  1. `GET /destinations/:slug/packages` retorna roteiros ativos de um destino cross-tenant
  2. `GET /packages/:id/guides` retorna guias qualificados ativos de um roteiro
  3. `GET /guides/:id/packages` retorna roteiros que um guia atende
  4. `POST` de slot rejeita se guia tem agenda sobreposta (mesma transação do lock de capacidade)
  5. Mensagem de erro de conflito inclui nome do guia, nome do roteiro conflitante, horário de início e fim
  6. Desativar `PackageGuide` NÃO cancela `DepartureSlot` existentes automaticamente
**Plans**: TBD
**UI hint**: no

### Phase 26: Frontend Discovery Pages
**Goal**: Turistas descobrem roteiros e guias do destino via páginas públicas linkadas bidirecionalmente
**Depends on**: Phase 25
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05
**Success Criteria** (what must be TRUE):
  1. `/destinos/[slug]/roteiros` lista todos os roteiros ativos com cards
  2. `/destinos/[slug]/roteiros/[id]` exibe detalhe do roteiro + cards de guias qualificados com links
  3. `/destinos/[slug]/guias` lista guias qualificados com cards
  4. `/destinos/[slug]/guias/[id]` exibe perfil completo do guia + lista de roteiros atendidos + CTA de reserva
  5. CTA da página `/destinos/[slug]` aponta para `/roteiros` (não `/guias`)
  6. Páginas de guia e roteiro linkam bidirecionalmente (hub-and-spoke)
**Plans**: TBD
**UI hint**: yes

### Phase 27: Partner Panel — Slot Creation
**Goal**: Parceiro cria DepartureSlot selecionando guia qualificado e vê erro de conflito de agenda inline
**Depends on**: Phase 25
**Requirements**: PANEL-01, PANEL-02
**Success Criteria** (what must be TRUE):
  1. Formulário de criação de slot exibe dropdown com apenas guias qualificados para o roteiro
  2. Erro de conflito exibido inline no formulário com mensagem específica (nome do guia + horários)
  3. Criação bem-sucedida atribui `guideId` ao novo slot
**Plans**: TBD
**UI hint**: yes

### Phase 28: Map Widget
**Goal**: Widget de mapa interativo na página do destino mostra parceiros e POIs próximos sem expor chave de API
**Depends on**: Phase 26
**Requirements**: MAP-01, MAP-02, MAP-03, MAP-04
**Success Criteria** (what must be TRUE):
  1. Widget de mapa renderiza na página do destino com MapLibre GL JS
  2. Parceiros da plataforma exibidos com marcadores distintos (priorizados visualmente)
  3. POIs da Overpass API carregados (hotéis, restaurantes, bares, locadoras)
  4. Widget carregado com `dynamic(..., { ssr: false })` — sem crash de SSR
  5. Falha da Overpass API degrada graciosamente — mapa renderiza apenas com parceiros
  6. Nenhuma API key exposta no código client-side
**Plans**: TBD
**UI hint**: yes

---

## Progress v2.1

| Phase | Plans Complete | Status | Concluído |
|-------|----------------|--------|-----------|
| 24. Schema & Data Migration | 1/1 | Complete | 2026-07-04 |
| 25. API Endpoints & Conflict Logic | 1/1 | Complete | 2026-07-05 |
| 26. Frontend Discovery Pages | 0/TBD | Not started | - |
| 27. Partner Panel — Slot Creation | 0/TBD | Not started | - |
| 28. Map Widget | 0/TBD | Not started | - |
