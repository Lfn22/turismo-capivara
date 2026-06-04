---
phase: 13
plan: "05"
subsystem: web/painel
tags: [mobile, ux, empty-state, toast, overflow]
dependency_graph:
  requires: [13-04]
  provides: [roteiros-empty-state, disponibilidade-toasts, dashboard-table-scroll]
  affects: [apps/web/app/[slug]/(painel)/painel]
tech_stack:
  added: []
  patterns: [EmptyState component reuse, sonner toast feedback, overflow-x scroll wrapper]
key_files:
  modified:
    - apps/web/app/[slug]/(painel)/painel/roteiros/page.tsx
    - apps/web/app/[slug]/(painel)/painel/disponibilidade/page.tsx
    - apps/web/app/[slug]/(painel)/painel/dashboard/page.tsx
decisions:
  - EmptyState component from @/src/components/ui/EmptyState used directly (ctaHref prop)
  - Gerenciar Slots link in roteiro cards updated to display:flex + minHeight:44px for touch target
  - Toast feedback added alongside existing inline error state (not replacing it)
metrics:
  duration: "8m"
  completed: "2026-06-04"
---

# Phase 13 Plan 05: Painel Polish Wave 3 Summary

Wave 3 (final) polish pass: EmptyState component in roteiros, sonner toasts in disponibilidade, and horizontal scroll wrapper for dashboard table.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | roteiros EmptyState + touch targets | 5a9f468 | roteiros/page.tsx |
| 2 | disponibilidade sonner toasts | 0d1fa85 | disponibilidade/page.tsx |
| 3 | dashboard table overflow-x | aebeb4b | dashboard/page.tsx |

## What Was Done

**Task 1 — roteiros/page.tsx**
- Replaced inline empty state (custom div + p + Link) with `<EmptyState>` component
- Props: `title="Nenhum roteiro cadastrado"`, `description="Crie seu primeiro roteiro para começar a receber reservas."`, `ctaLabel="Criar roteiro"`, `ctaHref=/{slug}/painel/roteiros/novo`
- Fixed "Gerenciar Slots" card link: changed `display: "block"` to `display: "flex"` with `alignItems: "center"` + `justifyContent: "center"` + `minHeight: "44px"`
- "Novo Roteiro" header button already had `minHeight: "44px"` — no change needed

**Task 2 — disponibilidade/page.tsx**
- Added `import { toast } from "sonner"`
- `handleCloseSlot`: `toast.success("Slot fechado.")` on success, `toast.error("Erro ao fechar slot.")` on failure
- `handleCreateSlot`: `toast.success("Slot criado com sucesso.")` on success, `toast.error("Erro ao criar slot.")` on failure
- Inline error states (`setCloseError`, `setFormApiError`) preserved alongside toasts

**Task 3 — dashboard/page.tsx**
- Wrapped `<table>` in `<div style={{ overflowX: "auto" }}>` to enable horizontal scroll on narrow viewports

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `apps/web/app/[slug]/(painel)/painel/roteiros/page.tsx` — exists, contains `EmptyState`
- `apps/web/app/[slug]/(painel)/painel/disponibilidade/page.tsx` — exists, contains `toast`
- `apps/web/app/[slug]/(painel)/painel/dashboard/page.tsx` — exists, contains `overflowX`
- Commits: 5a9f468, 0d1fa85, aebeb4b — all present in git log
