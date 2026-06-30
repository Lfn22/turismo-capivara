---
phase: 20
plan: "01"
subsystem: destinations-public
tags: [destinations, home, ordering, approved-filter]
dependency_graph:
  requires: []
  provides: [destinations-ordered-by-date, home-6-destinations]
  affects: [apps/web/app/page.tsx, apps/api/src/modules/destinations/destinations.routes.ts]
tech_stack:
  added: []
  patterns: [prisma-orderby, next-slice]
key_files:
  created: []
  modified:
    - apps/api/src/modules/destinations/destinations.routes.ts
    - apps/web/app/page.tsx
decisions:
  - "Página /destinos não precisou de mudança — API pública já filtra APPROVED na origem"
  - "Layout da home catalog mudou de height fixo (50dvh) para min-height para acomodar 2 linhas de cards"
metrics:
  duration: "5min"
  completed: "2026-06-29"
  tasks_completed: 2
  files_modified: 2
requirements: [POL-01, POL-02]
---

# Phase 20 Plan 01: Home pública — 6 destinos ordenados por data

**One-liner:** Home exibe 6 destinos (não 3) ordenados do mais recente ao mais antigo via orderBy createdAt desc na API.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | API: orderBy createdAt desc em GET /destinations | c6964e9 |
| 2 | Home: slice(0,6) + layout min-height para 2 linhas | 904e04c |

## Decisions Made

1. **Página /destinos inalterada** — A rota pública `GET /destinations` já tem `approvalStatus: 'APPROVED'` no where clause desde a implementação original. A página /destinos consome essa rota sem filtros adicionais, portanto já exibe apenas destinos APPROVED. Nenhuma mudança necessária.

2. **Layout catalog: height fixo → min-height** — Com 6 cards (2 linhas de 3), o `height: 50dvh` cortaria a segunda linha. Mudei para `min-height: 50dvh` e removi `overflow: hidden` do container para que o conteúdo expanda naturalmente.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Layout] Seção catalog ajustada para acomodar 2 linhas**
- **Found during:** Task 2
- **Issue:** CSS original usava `height: 50dvh` + `overflow: hidden` — com 6 cards a segunda linha seria cortada
- **Fix:** Mudei para `min-height: 50dvh`, removi `overflow: hidden` do container, adicionei `height: 220px` nos cards para uniformidade
- **Files modified:** `apps/web/app/page.tsx`
- **Commit:** 904e04c

## Known Stubs

Nenhum.

## Threat Flags

Nenhum.

## Self-Check: PASSED

- [x] `apps/api/src/modules/destinations/destinations.routes.ts` — orderBy createdAt desc presente
- [x] `apps/web/app/page.tsx` — slice(0, 6) presente
- [x] Commit c6964e9 existe
- [x] Commit 904e04c existe
