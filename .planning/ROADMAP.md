# Roadmap — Turismo Capivara

## Milestones Concluídos

- **v1.0 MVP** (2026-05-13) — Auth multi-tenant, guias verificados, roteiros, discovery, reservas + PIX. Phases 1–6.
- **v1.1 Launch Readiness** (2026-05-26) — Rate limiting, Sentry, onboarding autônomo de operadoras, emails transacionais, expiração de bookings, self-service do turista. Phases 7–10. → [Arquivo](milestones/v1.1-ROADMAP.md)

---

## v1.2 — UI/UX Polish + Guia Experience

**Goal:** App mobile-first com login global sem slug, UI/estilos unificados, painel do guia totalmente responsivo, e gestão de conteúdo de roteiros e destinos.

### Phases

- [ ] **Phase 11: Frontend Polish** — Navegação, tokens CSS consolidados, dead links removidos, brand CAPI unificada
- [ ] **Phase 12: Login Global** — Portal `/login` sem slug com email lookup automático de tenant
- [ ] **Phase 13: Painel Mobile + Feedback** — Card layout responsivo, touch targets, toasts, empty states, dialogs de confirmação
- [ ] **Phase 14: Gestao de Conteudo** — Guia cria/edita destinos com fotos e enriquece roteiros com galeria e experiências

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
**Plans**: TBD
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

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 11. Frontend Polish | 0/? | Not started | - |
| 12. Login Global | 0/? | Not started | - |
| 13. Painel Mobile + Feedback | 0/? | Not started | - |
| 14. Gestao de Conteudo | 0/? | Not started | - |

---

## Backlog (pós-v1.2)

- Templates de email com design visual (NOTIF-05)
- Queue de email com retry via BullMQ/Redis (OPS-04)
- Verificação de email no signup (ONBOARD-04)
- Links de recuperação com token por email (TOURIST-03)
- Chave de idempotência em POST /bookings (SEC-06)
- Reviews e avaliações de guias
- Repasse automático ao guia
