# Phase 26: Frontend Discovery Pages — Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Criação das páginas públicas de discovery — turistas exploram roteiros e guias de um destino via páginas linkadas bidirecionalmente (hub-and-spoke). Inclui:
- `/destinos/[slug]/roteiros` — listagem de roteiros ativos do destino
- `/destinos/[slug]/roteiros/[id]` — detalhe do roteiro + guias qualificados
- `/destinos/[slug]/guias` — diretório de guias do destino
- `/destinos/[slug]/guias/[id]` — perfil completo do guia + roteiros atendidos + CTA reserva
- Atualização do CTA em `/destinos/[slug]`

Fora de escopo: booking flow, slot picker, painel do parceiro (Phase 27), mapa (Phase 28).

</domain>

<decisions>
## Implementation Decisions

### Layout e Navegação

- **D-01:** Layout compartilhado em `app/destinos/[slug]/layout.tsx` com `StickyDestinationNav` no topo. Todas as 4 páginas de discovery herdam esse layout.
- **D-02:** `StickyDestinationNav` inclui abas "Roteiros" e "Guias" para alternar entre as duas listagens sem sair do destino.
- **D-03:** Páginas de detalhe (`/roteiros/[id]` e `/guias/[id]`) exibem breadcrumb completo — ex: `← Serra Capivara / Roteiros / Trilha do Sol`.
- **D-04:** Estrutura de pastas **direta**, sem route group: `app/destinos/[slug]/roteiros/page.tsx`, `app/destinos/[slug]/roteiros/[id]/page.tsx`, `app/destinos/[slug]/guias/page.tsx`, `app/destinos/[slug]/guias/[id]/page.tsx`.
- **D-05:** CTA principal da página existente `/destinos/[slug]` é **substituído** por "Ver roteiros" apontando para `/destinos/[slug]/roteiros` (DISC-05).

### PackageCard — novo componente

- **D-06:** Criar `apps/web/src/components/ui/PackageCard.tsx`. Não existe atualmente.
- **D-07:** Campos exibidos no card: nome, duração, preço ("A partir de R$ X"), dificuldade (badge colorido), foto, tags/especialidades do roteiro.
- **D-08:** Dificuldade exibida como **badge colorido**: verde = Fácil, amarelo = Moderado, vermelho = Difícil. Texto em português.
- **D-09:** Preço formatado como **"A partir de R$ X"** — indica preço mínimo, adequado para roteiros com variações.
- **D-10:** Foto ausente → placeholder **stone-800 + ícone** (padrão idêntico ao `DestinationCard.tsx`).
- **D-11:** Seguir padrão visual e estrutural dos componentes existentes: inline `<style>` com CSS vars (`--stone-*`, `--ochre`), `<Link>` agnóstico de rota via prop `href`.

### CTA "Reservar" na página do guia

- **D-12:** CTA "Reservar com [nome]" na página `/destinos/[slug]/guias/[id]` é uma **âncora `#roteiros`** que rola a página até a seção de roteiros do guia.
- **D-13:** A lista de roteiros atendidos na página do guia usa o **`PackageCard` completo** (mesma aparência da listagem `/roteiros`). Consistente e reutiliza o componente.

### Disponibilidade

- **D-14:** A listagem `/destinos/[slug]/roteiros` exibe **apenas os campos do roteiro** (nome, duração, preço, dificuldade, foto, tags). Sem dados de slots/disponibilidade na listagem — nenhuma chamada extra à API por roteiro.
- **D-15:** Dados de disponibilidade (slots, datas) ficam para a página de detalhe do roteiro, se necessário, e para o slot picker (Phase 27).

### Claude's Discretion

- Skeleton loading vs spinner por página — Claude decide por consistência com o app existente.
- Comportamento do `EmptyState.tsx` quando destino não tem roteiros ou guias cadastrados.
- Número máximo de tags exibidas no `PackageCard` (sugestão: 3, padrão do `GuideCard`).
- Estrutura do módulo `lib/api/` para chamadas de Server Components (se ainda não existe padrão).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos desta fase
- `.planning/REQUIREMENTS.md` — DISC-01, DISC-02, DISC-03, DISC-04, DISC-05 (linhas 32–36)

### Roadmap
- `.planning/ROADMAP.md` — Phase 26 success criteria e dependências

### Componentes existentes (leitura obrigatória antes de criar PackageCard)
- `apps/web/src/components/ui/GuideCard.tsx` — padrão de card a seguir (inline style, href prop, fallback blur)
- `apps/web/src/components/ui/DestinationCard.tsx` — padrão de placeholder de foto (stone-800 + ícone)
- `apps/web/src/components/ui/EmptyState.tsx` — usar para estados vazios
- `apps/web/src/components/ui/ErrorBoundary.tsx` — usar para páginas de detalhe
- `apps/web/src/components/layout/StickyDestinationNav.tsx` — layout compartilhado das páginas de discovery
- `apps/web/src/components/ui/BackButton.tsx` — disponível para breadcrumb/back

### Padrões de código estabelecidos
- `.planning/phases/05-painel-do-guia/05-CONTEXT.md` — D-04 (RSC fetch), D-06/D-07 (route structure com [slug])
- `.planning/phases/06-interface-do-turista/06-CONTEXT.md` — padrões de rotas públicas e uso de `use(params)` no Next.js 16

### API endpoints a consumir
- `GET /destinations/:slug/packages` — listagem de roteiros ativos do destino (cross-tenant, público)
- `GET /packages/:id/guides` — guias qualificados de um roteiro
- `GET /guides/:id/packages` — roteiros atendidos por um guia
- Todos implementados e validados na Phase 25

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GuideCard.tsx` — reutilizar diretamente nas páginas `/roteiros/[id]` e `/guias` com prop `href` apontando para `/destinos/[slug]/guias/[id]`
- `DestinationCard.tsx` — referência de padrão visual para `PackageCard.tsx`
- `StickyDestinationNav.tsx` — layout compartilhado; verificar props aceitas antes de modificar
- `EmptyState.tsx` — usar quando destino não tem roteiros/guias
- `ErrorBoundary.tsx` — wrap nas páginas de detalhe
- `BackButton.tsx` — usar no breadcrumb das páginas de detalhe

### Established Patterns
- RSC fetch: cada `page.tsx` busca seus próprios dados no servidor sem estado global
- `use(params)` para Client Components com dynamic params no Next.js 16
- Fetch sem auth para rotas públicas: `process.env.API_URL` (server-side, não `NEXT_PUBLIC_`)
- Inline `<style>` com CSS custom properties (`--stone-*`, `--ochre`, `--font-display`)
- Mobile-first obrigatório — usar `100dvh`, `clamp()`, testar iOS Safari

### Integration Points
- `app/destinos/[slug]/page.tsx` — modificar CTA principal → "Ver roteiros" (D-05)
- `app/destinos/[slug]/layout.tsx` — criar ou modificar para incluir `StickyDestinationNav` com abas
- Novas páginas se conectam às APIs públicas da Phase 25 (sem JWT)

</code_context>

<specifics>
## Specific Ideas

- Abas "Roteiros" e "Guias" no `StickyDestinationNav` — verificar se o componente já suporta tabs ou se precisa de extensão
- Badge de dificuldade: texto traduzido (`EASY → Fácil`, `MODERATE → Moderado`, `HARD → Difícil`)
- CTA "Reservar com [nome]" usa âncora `href="#roteiros"` — a seção deve ter `id="roteiros"` na página do guia
- `PackageCard` deve exportar sua interface de props (`PackageCardPackage`) assim como `GuideCard` exporta `GuideCardGuide` — para type-safety nas pages

</specifics>

<deferred>
## Deferred Ideas

- Filtro de roteiros por dificuldade/duração/preço na listagem — nova capacidade, candidato a fase futura
- Disponibilidade de slots na listagem de roteiros ("3 saídas em agosto") — decidido não incluir nesta fase
- Reviews/avaliações de guias e roteiros — fora do escopo MVP
- Compartilhamento de página de roteiro/guia (share button) — nova capacidade

</deferred>

---

*Phase: 26-frontend-discovery*
*Context gathered: 2026-07-06*
