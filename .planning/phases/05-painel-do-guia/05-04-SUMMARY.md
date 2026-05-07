---
phase: 05-painel-do-guia
plan: "04"
subsystem: web-painel
tags: [dashboard, reservas, rsc, client-component, optimistic-update, nextauth]
dependency_graph:
  requires: ["05-01", "05-02", "05-03"]
  provides: ["guide-dashboard", "guide-reservas-page"]
  affects: ["apps/web/app/[slug]/(painel)/painel/"]
tech_stack:
  added: []
  patterns:
    - "RSC com getServerSession para fetch server-side autenticado"
    - "Client Component com use(params) para slug dinâmico no Next.js 16"
    - "Optimistic update com revert em caso de erro de API"
key_files:
  created:
    - apps/web/app/[slug]/(painel)/painel/dashboard/page.tsx
    - apps/web/app/[slug]/(painel)/painel/reservas/page.tsx
  modified: []
decisions:
  - "use(params) em Client Component (não await) — padrão Next.js 16 para params Promise em CC"
  - "Token extraído de session.user.token (campo apiToken mapeado no callback session de auth.ts)"
  - "Dashboard busca packages para calcular roteiros ativos; usa Array.isArray para normalizar resposta"
metrics:
  duration: "~25min"
  completed_date: "2026-05-07T22:44:46Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 5 Plan 04: Dashboard + Reservas Summary

Dashboard RSC com 4 stat cards + tabela de últimas reservas; tela de Reservas com filtro por status, ações de confirmar/cancelar com optimistic update.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Dashboard RSC | 557b1ef | apps/web/app/[slug]/(painel)/painel/dashboard/page.tsx |
| 2 | Reservas Client Page | a1a9c36 | apps/web/app/[slug]/(painel)/painel/reservas/page.tsx |

## What Was Built

### dashboard/page.tsx (RSC)
- `getServerSession(authOptions)` para token JWT server-side
- Fetch paralelo: `guides/me/bookings` + `packages` via `apiFetch`
- 4 stat cards: Reservas hoje, Pendentes de confirmação, Roteiros ativos, Total de reservas
- Card de "Pendentes" destacado com borda `var(--ochre)` quando count > 0
- Tabela das 5 últimas reservas com `StatusBadge`
- Estado de erro com mensagem em português

### reservas/page.tsx (Client Component)
- `"use client"` + `use(params)` para slug dinâmico (padrão Next.js 16)
- `useSession()` para token JWT client-side
- Fetch de `guides/me/bookings` com reload via botão "Tentar novamente"
- Dropdown de filtro: ALL / PENDING / CONFIRMED / CANCELLED / CHECKED_IN / COMPLETED
- Optimistic update com revert automático em caso de erro
- PENDING: botões "Confirmar" (ochre) + "Cancelar Reserva" (red)
- CONFIRMED: apenas "Cancelar Reserva"
- Skeleton loading (4 linhas animadas com shimmer)
- `actionLoading` desabilita botões (anti-DoS T-05-14)

## Deviations from Plan

None — plano executado exatamente como especificado.

Nota: o plano mencionava `params: { slug: string }` (síncrono) para Client Components, mas o Next.js 16 exige `params: Promise<{ slug: string }>` com `use(params)`. Aplicado o padrão correto conforme docs em `node_modules/next/dist/docs/`.

## Known Stubs

None — ambas as páginas buscam dados reais da API.

## Threat Flags

Nenhuma superfície nova além do especificado no threat model do plano.

| Flag | File | Description |
|------|------|-------------|
| — | — | Nenhum threat flag adicional |

## Self-Check: PASSED

- [x] `apps/web/app/[slug]/(painel)/painel/dashboard/page.tsx` existe
- [x] `apps/web/app/[slug]/(painel)/painel/reservas/page.tsx` existe
- [x] commit 557b1ef existe (dashboard)
- [x] commit a1a9c36 existe (reservas)
- [x] `pnpm --filter @turismo/web build` exitou 0
- [x] rotas aparecem como `ƒ (Dynamic)` no build output
