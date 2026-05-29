# Requirements: Turismo Capivara — v1.2

**Defined:** 2026-05-28
**Core Value:** Guia de turismo publica roteiros e gerencia reservas digitalmente. Turista encontra, reserva e paga com PIX — sem WhatsApp, sem dinheiro em espécie.

## v1.2 Requirements

### Login Global

- [ ] **LOGIN-01**: Botão "Painel" na PublicNav aponta para `/login` (não para onboarding)
- [ ] **LOGIN-02**: Página `/login` sem slug — um único portal de acesso para guias, agências e admins
- [ ] **LOGIN-03**: Email lookup resolve automaticamente a qual agência/tenant o usuário pertence
- [ ] **LOGIN-04**: Abaixo do form de login, botão "Cadastrar agência ou guia" redireciona para onboarding
- [ ] **LOGIN-05**: Fluxo de forgot password básico com envio de link por email

### Mobile UX — Painel do Guia

- [ ] **MOBILE-01**: Tabela de reservas no painel vira card layout em telas < 768px
- [ ] **MOBILE-02**: Tabela de roteiros no painel vira card layout em telas < 768px
- [ ] **MOBILE-03**: Todos os botões e links interativos têm touch target mínimo de 44×44px
- [ ] **MOBILE-04**: Todos os inputs têm font-size 16px para evitar zoom automático no iOS Safari
- [ ] **MOBILE-05**: Modais no mobile usam slide-up sheet em vez de overlay centrado

### Feedback e Estados

- [ ] **FEEDBACK-01**: Sistema de toast global — sucesso, erro e info em todas as ações do painel
- [ ] **FEEDBACK-02**: Empty state em "Minhas Reservas" quando não há reservas, com CTA para compartilhar link
- [ ] **FEEDBACK-03**: Empty state em "Meus Roteiros" quando não há roteiros, com CTA para criar roteiro
- [ ] **FEEDBACK-04**: ErrorBoundary em toda a aplicação com mensagem útil e botão "Tentar novamente"
- [ ] **FEEDBACK-05**: Dialog de confirmação antes de cancelar uma reserva ("Tem certeza?")

### Navegação

- [ ] **NAV-01**: Back button visível em todas as páginas exceto homepage
- [ ] **NAV-02**: Transições suaves entre páginas (sem flash branco entre rotas)

### Unificação de Estilos

- [ ] **STYLE-01**: Todos os 161 valores hex hardcoded substituídos por tokens CSS de globals.css
- [ ] **STYLE-02**: Paradigma de inline `React.CSSProperties` eliminado — componentes usam tokens CSS
- [ ] **STYLE-03**: Classes BEM com `<style>` injetado migradas para tokens CSS
- [ ] **STYLE-04**: Tailwind utilities removidos de componentes que usam o design system próprio
- [ ] **STYLE-05**: `apps/web/app/dashboard/page.tsx` (legacy stub) deletado

### UI/UX Audit Fixes

- [ ] **AUDIT-01**: ConversionAnchor (waitlist) conectado na API real — fim do `setTimeout` fake
- [ ] **AUDIT-02**: Links mortos removidos da navegação pública (Blog, Ver todos, redes sociais)
- [ ] **AUDIT-03**: Nome "CAPI" unificado em todos os `<title>` e meta `description` do browser
- [ ] **AUDIT-04**: Font-size fallback corrigido: `var(--font-display, Georgia, serif)` consistente
- [ ] **AUDIT-05**: Inputs de formulários de onboarding herdam font-body sem override manual

### Gestão de Conteúdo — Destinos

- [ ] **DEST-01**: Guia/agência pode criar novo destino com nome, descrição e região (tag)
- [ ] **DEST-02**: Upload de foto de capa para o destino (armazenamento local ou S3)
- [ ] **DEST-03**: Destino criado fica visível no marketplace após aprovação de admin
- [ ] **DEST-04**: Guia pode editar e deletar destinos que criou

### Gestão de Conteúdo — Roteiros

- [ ] **ROT-01**: Guia pode adicionar fotos a um roteiro existente (galeria de imagens)
- [ ] **ROT-02**: Guia pode descrever experiências incluídas no roteiro (lista de destaques)
- [ ] **ROT-03**: Fotos e experiências aparecem na página pública do roteiro para o turista

## Out of Scope (v1.2)

| Feature | Reason |
|---------|--------|
| Avaliações turista ↔ guia | v2 — pós-MVP |
| Perfil público do guia | v2 — pós-MVP |
| Upload de vídeo | Custo de storage/bandwidth — defer |
| Multi-idioma (EN/ES) | v2 — mercado inicial é Brasil |
| App nativo (iOS/Android) | Web-first — PWA suficiente no curto prazo |
| Forgot password | Adiado — não bloqueador de launch |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LOGIN-01 | Phase 12 | Pending |
| LOGIN-02 | Phase 12 | Pending |
| LOGIN-03 | Phase 12 | Pending |
| LOGIN-04 | Phase 12 | Pending |
| LOGIN-05 | Phase 12 | Pending |
| MOBILE-01 | Phase 13 | Pending |
| MOBILE-02 | Phase 13 | Pending |
| MOBILE-03 | Phase 13 | Pending |
| MOBILE-04 | Phase 13 | Pending |
| MOBILE-05 | Phase 13 | Pending |
| FEEDBACK-01 | Phase 13 | Pending |
| FEEDBACK-02 | Phase 13 | Pending |
| FEEDBACK-03 | Phase 13 | Pending |
| FEEDBACK-04 | Phase 13 | Pending |
| FEEDBACK-05 | Phase 13 | Pending |
| NAV-01 | Phase 11 | Pending |
| NAV-02 | Phase 11 | Pending |
| STYLE-01 | Phase 11 | Pending |
| STYLE-02 | Phase 11 | Pending |
| STYLE-03 | Phase 11 | Pending |
| STYLE-04 | Phase 11 | Pending |
| STYLE-05 | Phase 11 | Pending |
| AUDIT-01 | Phase 11 | Pending |
| AUDIT-02 | Phase 11 | Pending |
| AUDIT-03 | Phase 11 | Pending |
| AUDIT-04 | Phase 11 | Pending |
| AUDIT-05 | Phase 11 | Pending |
| DEST-01 | Phase 14 | Pending |
| DEST-02 | Phase 14 | Pending |
| DEST-03 | Phase 14 | Pending |
| DEST-04 | Phase 14 | Pending |
| ROT-01 | Phase 14 | Pending |
| ROT-02 | Phase 14 | Pending |
| ROT-03 | Phase 14 | Pending |

**Coverage:**
- v1.2 requirements: 34 total
- Mapped to phases: 34/34 ✓
- Phase 11 (Frontend Polish): NAV-01–02, STYLE-01–05, AUDIT-01–05 = 12 requirements
- Phase 12 (Login Global): LOGIN-01–05 = 5 requirements
- Phase 13 (Painel Mobile + Feedback): MOBILE-01–05, FEEDBACK-01–05 = 10 requirements
- Phase 14 (Gestao de Conteudo): DEST-01–04, ROT-01–03 = 7 requirements

---
*Requirements defined: 2026-05-28*
*Last updated: 2026-05-28 — roadmap created, traceability populated*
