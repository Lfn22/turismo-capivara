---
phase: 20-polimento-e-dados-publicos
plan: "02"
subsystem: web/painel
tags: [ui, rename, sidebar, crud]
dependency_graph:
  requires: []
  provides: [nav-locais-label, crud-locais-headings]
  affects: [SidebarNav, destinos-crud-pages]
tech_stack:
  added: []
  patterns: [surgical-text-replacement]
key_files:
  created: []
  modified:
    - apps/web/components/sidebar/SidebarNav.tsx
    - apps/web/app/[slug]/(painel)/painel/destinos/page.tsx
    - apps/web/app/[slug]/(painel)/painel/destinos/novo/page.tsx
    - apps/web/app/[slug]/(painel)/painel/destinos/[id]/editar/page.tsx
decisions:
  - "Nomes de funções/componentes (DestinosPage, EditarDestinoPage) não alterados — são código interno, não UI visível"
  - "Rotas href /painel/destinos preservadas — só label visível mudou"
metrics:
  duration: ~5min
  completed: 2026-06-30
---

# Phase 20 Plan 02: Renomear Destinos → Locais no Painel Summary

Nav item do painel e páginas CRUD de destinos renomeados de "Destinos/Destino" para "Locais/Local" em toda UI visível, sem alterar rotas, variáveis TypeScript ou chamadas de API.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Renomear nav item "Destinos" → "Locais" no SidebarNav | 627f8ef | SidebarNav.tsx |
| 2 | Atualizar headings e toasts nas páginas CRUD | 339724c | page.tsx, novo/page.tsx, [id]/editar/page.tsx |

## Deviations from Plan

None — plano executado exatamente como especificado.

## Known Stubs

None.

## Threat Flags

None — mudança puramente visual, sem novo surface de dados ou endpoints.

## Self-Check: PASSED

- `apps/web/components/sidebar/SidebarNav.tsx` — modificado, commitado em 627f8ef
- `apps/web/app/[slug]/(painel)/painel/destinos/page.tsx` — modificado, commitado em 339724c
- `apps/web/app/[slug]/(painel)/painel/destinos/novo/page.tsx` — modificado, commitado em 339724c
- `apps/web/app/[slug]/(painel)/painel/destinos/[id]/editar/page.tsx` — modificado, commitado em 339724c
- Commits verificados: `git log --oneline -5` confirma 627f8ef e 339724c
