# Requirements — Turismo Capivara v2.1

> **Milestone:** v2.1 — Multi-Guide & Discovery
> **Status:** Active
> **Created:** 2026-07-03
> **Traceability:** Ver ROADMAP.md para mapeamento por fase

---

## Schema (SCH)

- [ ] **SCH-01:** Sistema suporta N:N entre roteiros e guias via tabela `PackageGuide` com campo `active` — um guia pode atender múltiplos roteiros, um roteiro pode ter múltiplos guias qualificados
- [ ] **SCH-02:** `DepartureSlot` possui FK nullable `guideId → GuideProfile`; slots sem guia ficam ocultos do público (filtro `guideId IS NOT NULL` em queries públicas); slots com reservas ativas sem guia geram alerta CRÍTICO na validação
- [ ] **SCH-03:** `TourPackage` possui campos `durationMinHours Int` e `durationMaxHours Int` (em horas) e `bufferMinutes Int @default(60)` — usados no cálculo de janela de ocupação para conflito de agenda
- [ ] **SCH-04:** `Tenant` possui `@@index([destinationId])` para performance da query cross-tenant destination → packages

## Conflito de Agenda (SCHED)

- [ ] **SCHED-01:** Sistema impede criação de `DepartureSlot` com janela de ocupação sobreposta para o mesmo guia — checagem dentro da mesma transação que protege capacidade (`$transaction`); janela = `startsAt` até `startsAt + durationMaxHours*60 + bufferMinutes`
- [ ] **SCHED-02:** Mensagem de erro de conflito inclui: nome do guia, nome do roteiro conflitante, horário de início e horário de fim estimado (duração máxima + buffer)
- [ ] **SCHED-03:** Desativação de qualificação (`PackageGuide.active = false`) não cancela `DepartureSlot` já criados retroativamente — ações distintas, sem cascade automático

## API Discovery (API)

- [ ] **API-01:** `GET /destinations/:slug/packages` lista roteiros ativos de uma cidade (cross-tenant, público) — query via `TourPackage → Tenant → Destination.slug`, filtro `active = true`
- [ ] **API-02:** `GET /packages/:id/guides` lista guias qualificados de um roteiro (`PackageGuide.active = true`) com nome, foto, especialidades e regiões
- [ ] **API-03:** `GET /guides/:id/packages` lista roteiros que um guia atende (via PackageGuide) com nome, preço, duração e dificuldade
- [ ] **API-04:** `POST /tenants/:slug/packages/:id/slots` inclui campo `guideId` obrigatório; guia deve estar qualificado (`PackageGuide.active = true`) para o pacote; checagem de conflito de agenda executada antes do insert

## Frontend Discovery (DISC)

- [ ] **DISC-01:** Página `/destinos/[slug]/roteiros` lista todos os roteiros ativos do destino com cards (nome, duração, preço, dificuldade, foto) e link para detalhe
- [ ] **DISC-02:** Página `/destinos/[slug]/roteiros/[id]` exibe detalhe do roteiro e lista guias qualificados com `GuideCard` e link para perfil de cada um
- [ ] **DISC-03:** Página `/destinos/[slug]/guias` exibe diretório de guias do destino com cards e link para perfil
- [ ] **DISC-04:** Página `/destinos/[slug]/guias/[id]` exibe perfil completo do guia (bio, foto, especialidades, regiões, portfolio) com CTA "Reservar com [nome]" e lista de roteiros atendidos com link para cada roteiro
- [ ] **DISC-05:** Página da cidade (`/destinos/[slug]`) tem CTA "Ver roteiros" apontando para `/destinos/[slug]/roteiros`

## Painel do Parceiro (PANEL)

- [ ] **PANEL-01:** Formulário de criação de `DepartureSlot` no painel do parceiro permite selecionar guia dentre os qualificados para o roteiro (`PackageGuide.active = true`) via dropdown
- [ ] **PANEL-02:** Erro de conflito de agenda é exibido em destaque no formulário com nome do guia e horários conflitantes — mensagem específica, não genérica

## Widget de Mapa (MAP)

- [ ] **MAP-01:** Widget de mapa na página do destino exibe parceiros cadastrados na plataforma (priorizados visualmente) e POIs próximos via Overpass API (hotéis, restaurantes, bares, locadoras)
- [ ] **MAP-02:** Widget usa MapLibre GL JS + tiles Maptiler (free tier) + Overpass API; carregado com `dynamic(..., { ssr: false })` para evitar SSR de módulo WebGL (~250KB gzip)
- [ ] **MAP-03:** Falha da Overpass API não bloqueia renderização — widget exibe normalmente apenas com parceiros cadastrados; POIs externos são enhancement, nunca bloqueante
- [ ] **MAP-04:** API key do Maptiler fica apenas em variável de ambiente server-side; proxy Next.js route serve tiles — chave nunca exposta ao client

---

## Deferred (fora do v2.1)

- Sistema de avaliações de guias (turista avalia guia pós-tour) — v3.0
- Cache de POIs com Redis/Upstash — v3.0 se volume justificar
- i18n (next-intl, prefixo `/en/...`) — v3.0
- Múltiplos idiomas nos campos de conteúdo (bio, descrição de roteiro) — v3.0

## Out of Scope

- Reserva de hotel/restaurante dentro da plataforma — foco é vitrine/descoberta
- App nativo (iOS/Android) — web mobile-first suficiente no MVP
- Repasse financeiro ao guia via plataforma — fora do escopo; relação Tenant ↔ guia é externa
- White-label por marketplace — uma plataforma, múltiplos destinos

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| SCH-01, SCH-02, SCH-03, SCH-04 | Phase 24 | Pending |
| SCHED-01, SCHED-02, SCHED-03, API-01, API-02, API-03, API-04 | Phase 25 | Pending |
| DISC-01, DISC-02, DISC-03, DISC-04, DISC-05 | Phase 26 | Pending |
| PANEL-01, PANEL-02 | Phase 27 | Pending |
| MAP-01, MAP-02, MAP-03, MAP-04 | Phase 28 | Pending |
