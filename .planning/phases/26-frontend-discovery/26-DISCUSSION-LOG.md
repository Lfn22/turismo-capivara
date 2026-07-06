# Phase 26: Frontend Discovery Pages — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-06
**Phase:** 26-frontend-discovery
**Areas discussed:** Layout e navegação, PackageCard, CTA Reservar, Disponibilidade

---

## Layout e Navegação

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, layout compartilhado | `app/destinos/[slug]/layout.tsx` com StickyDestinationNav | ✓ |
| Só nas listagens | Nav só em /roteiros e /guias, detalhe standalone | |
| Não, standalone | Cada página cuida do próprio cabeçalho | |

**User's choice:** Layout compartilhado com StickyDestinationNav

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, breadcrumb | Hierarquia completa nas páginas de detalhe | ✓ |
| Só BackButton | BackButton.tsx existente, mais simples | |
| Claude decide | — | |

**User's choice:** Breadcrumb nas páginas de detalhe

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, abas no nav | "Roteiros \| Guias" no sticky header | ✓ |
| Não, navegação separada | Seções acessadas via links/CTAs | |

**User's choice:** Abas "Roteiros \| Guias" no StickyDestinationNav

---

| Option | Description | Selected |
|--------|-------------|----------|
| Adicionar CTA "Ver roteiros" | Sem remover conteúdo existente | |
| Substituir CTA principal | Ação primária vira "Ver roteiros" | ✓ |
| Claude decide | — | |

**User's choice:** Substituir CTA principal da página `/destinos/[slug]` por "Ver roteiros"

---

| Option | Description | Selected |
|--------|-------------|----------|
| Route group `(discovery)` | `app/destinos/[slug]/(discovery)/roteiros/...` | |
| Pasta direta | `app/destinos/[slug]/roteiros/...` | ✓ |

**User's choice:** Pasta direta, sem route group

---

## PackageCard — Novo Componente

| Option | Description | Selected |
|--------|-------------|----------|
| Ícone + cor sólida | Fundo stone-800 + ícone (padrão DestinationCard) | ✓ |
| Gradiente com inicial | Fundo gradiente + inicial do nome | |
| Claude decide | — | |

**User's choice:** Placeholder stone-800 + ícone

---

| Option | Description | Selected |
|--------|-------------|----------|
| Badge colorido | Verde/amarelo/vermelho com texto traduzido | ✓ |
| Texto simples | Label sem destaque visual | |
| Claude decide | — | |

**User's choice:** Badge colorido (Fácil/Moderado/Difícil)

---

| Option | Description | Selected |
|--------|-------------|----------|
| "A partir de R$ X" | Preço mínimo, adequado para variações | ✓ |
| "R$ X,XX" | Preço exato | |
| Claude decide | — | |

**User's choice:** "A partir de R$ X"

---

| Option | Description | Selected |
|--------|-------------|----------|
| Exatamente 5 campos | Nome, duração, preço, dificuldade, foto | |
| + especialidades/tags | Adiciona tags do roteiro | ✓ |
| Claude decide | — | |

**User's choice:** 5 campos + tags/especialidades

---

## CTA "Reservar" na Página do Guia

| Option | Description | Selected |
|--------|-------------|----------|
| Âncora para lista de roteiros | Rola para `#roteiros` na mesma página | ✓ |
| Link para o primeiro roteiro | Abre diretamente `/roteiros/[id]` do primeiro roteiro | |
| Desabilitado até Phase 27 | Visual placeholder sem ação | |

**User's choice:** Âncora `#roteiros` na própria página

---

| Option | Description | Selected |
|--------|-------------|----------|
| PackageCard completo | Mesma aparência da listagem /roteiros | ✓ |
| Layout compacto | Lista menor sem foto | |
| Claude decide | — | |

**User's choice:** PackageCard completo na página do guia

---

## Disponibilidade na Listagem

| Option | Description | Selected |
|--------|-------------|----------|
| Não — apenas campos do roteiro | Sem dados de slots na listagem | ✓ |
| Sim — "próximas saídas" | N chamadas adicionais à API | |
| Claude decide | — | |

**User's choice:** Sem dados de disponibilidade na listagem

---

## Claude's Discretion

- Skeleton vs spinner por página
- Comportamento do EmptyState quando sem roteiros/guias
- Número máximo de tags no PackageCard
- Estrutura do módulo `lib/api/` se necessário

## Deferred Ideas

- Filtro de roteiros por dificuldade/duração/preço
- Disponibilidade de slots na listagem ("3 saídas em agosto")
- Reviews/avaliações de guias e roteiros
- Compartilhamento de página (share button)
