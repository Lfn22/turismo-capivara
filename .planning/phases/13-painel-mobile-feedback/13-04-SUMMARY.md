---
phase: 13
plan: "04"
subsystem: web-painel
tags: [mobile, toast, ui, feedback, reservas]
dependency_graph:
  requires: [13-01, 13-02, 13-03]
  provides: [painel-toast-feedback, reservas-mobile-cards, cancel-dialog-integration]
  affects: [apps/web/app/[slug]/(painel)/layout.tsx, apps/web/app/[slug]/(painel)/painel/reservas/page.tsx]
tech_stack:
  added: []
  patterns: [sonner-toasts, radix-cancel-dialog, mobile-card-list, responsive-table-hide]
key_files:
  modified:
    - apps/web/app/[slug]/(painel)/layout.tsx
    - apps/web/app/[slug]/(painel)/painel/reservas/page.tsx
decisions:
  - Use CSS media query via <style> tag (display:none/block) for mobile/desktop switching — consistent with existing painel pattern
  - EmptyState CTA uses onCtaClick to copy guide share link with toast.success feedback
metrics:
  duration: "106s"
  completed: "2026-06-04"
  tasks_completed: 2
  files_modified: 2
---

# Phase 13 Plan 04: Painel Layout + Reservas Mobile/Toast Summary

Toaster e ErrorBoundary adicionados ao layout do painel; página de reservas refatorada com cards mobile (<640px), tabela desktop (>=640px), toasts sonner substituindo actionError, CancelDialog para confirmação de cancelamento e EmptyState para lista vazia.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Toaster + ErrorBoundary no layout painel | 71c4b65 |
| 2 | Reservas: mobile cards, toasts, CancelDialog, EmptyState | 9d49048 |

## Changes Made

### Task 1 — layout.tsx
- Importou `Toaster` de `sonner` e `ErrorBoundary` de `@/src/components/ui/ErrorBoundary`
- `<Toaster position="top-right" richColors />` adicionado antes do div principal
- `<ErrorBoundary>` envolve todo o conteúdo do layout
- Todas as páginas do painel herdam toast e error boundary automaticamente

### Task 2 — reservas/page.tsx
- `actionError` state removido completamente
- `handleConfirm`: usa `toast.success("Reserva confirmada.")` / `toast.error("Erro ao processar.")`
- `handleCancel`: apenas abre CancelDialog (set state) — não chama API
- `executeCancel`: chamado pelo `onConfirm` do CancelDialog — faz API call + toast
- `filtered.length === 0`: renderiza `<EmptyState title="Nenhuma reserva encontrada" ctaLabel="Copiar link" onCtaClick={...} />`
- Cards mobile: `<ul className="reservas-card-list">` — `display:none` por padrão, `display:block` em `@media (max-width: 639px)`
- Tabela desktop: `<table className="reservas-table">` — `display:none` em `@media (max-width: 639px)`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — EmptyState CTA wires `navigator.clipboard.writeText` with guide share URL (`/${slug}`).

## Threat Flags

None — no new network endpoints or auth paths introduced.

## Self-Check

- [x] `apps/web/app/[slug]/(painel)/layout.tsx` exists with Toaster and ErrorBoundary
- [x] `apps/web/app/[slug]/(painel)/painel/reservas/page.tsx` exists with all required features
- [x] Commit 71c4b65 exists (layout)
- [x] Commit 9d49048 exists (reservas)
- [x] `actionError` not present in reservas/page.tsx
- [x] `toast.success`, `toast.error`, `CancelDialog`, `EmptyState` all present

## Self-Check: PASSED
