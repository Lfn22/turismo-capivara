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

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 11. Frontend Polish | 5/5 | Complete | 2026-06-01 |
| 12. Login Global | 3/3 | Complete   | 2026-06-02 |
| 12.1. Pre-Launch Hardening | 3/3 | Complete | 2026-06-03 |
| 13. Painel Mobile + Feedback | 0/? | Not started | - |
| 14. Gestao de Conteudo | 8/8 | Complete | 2026-06-11 |
| 16. Integridade de Pagamento | 0/? | Not started | - |
| 17. Segurança e Dados | 4/4 | Complete | 2026-06-22 |
| 18. UX do Checkout | 0/2 | Planning | - |
| 19. Confiabilidade Operacional | 0/? | Not started | - |
| 20. Polimento e Dados Públicos | 0/? | Not started | - |

---

## Backlog (pós-v1.3)

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
