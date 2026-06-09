---
phase: 14-gestao-de-conteudo
plan: "07"
subsystem: web/super-admin
tags: [approval-queue, super-admin, destinations, moderation]
dependency_graph:
  requires: [14-04]
  provides: [super-admin-destination-approval-ui]
  affects: [apps/web/app/super-admin]
tech_stack:
  added: []
  patterns: [optimistic-ui, client-component, next-api-proxy]
key_files:
  created:
    - apps/web/app/super-admin/destinos/page.tsx
    - apps/web/app/api/admin/destinations/pending/route.ts
    - apps/web/app/api/admin/destinations/[id]/approve/route.ts
  modified:
    - apps/web/app/super-admin/layout.tsx
decisions:
  - "Rejeição sem modal de motivo — simplificado em relação ao padrão de operadoras para MVP (sem campo de razão obrigatória)"
  - "Rollback otimista restaura apenas o item rejeitado ao topo da lista (não reordena)"
  - "Proxy routes criadas em /api/admin/destinations/* pois o proxy genérico só permite /tenants/*"
metrics:
  duration: "25min"
  completed: "2026-06-09"
  tasks_completed: 4
  files_changed: 4
---

# Phase 14 Plan 07: Destination Approval Queue UI Summary

Super-admin approval workflow UI for destinations. PENDING destinations appear in a queue; super-admin can approve (PENDING → APPROVED) or reject (PENDING → REJECTED) with optimistic updates.

## What Was Built

### 1. Super-admin navigation updated (`layout.tsx`)
- Converted static header to `"use client"` component with active-link highlighting
- Added `navItems` array: Operadoras + Destinos
- Nav links use `usePathname()` for active state (ochre color highlight)
- Mobile-responsive: flex with `flexWrap: wrap`

### 2. API proxy routes created
- `GET /api/admin/destinations/pending` → proxies to `GET {API_URL}/admin/destinations/pending`
- `PATCH /api/admin/destinations/:id/approve` → proxies to `PATCH {API_URL}/destinations/:id/approve`
- Both routes require `apiToken` (401) and `SUPER_ADMIN | ADMIN` role (403)

### 3. Approval queue page (`/super-admin/destinos/page.tsx`)
- Fetches PENDING destinations on mount from `/api/admin/destinations/pending`
- Card layout: thumbnail (60×60px), name, tenant slug, state, PENDENTE badge, Aprovar + Rejeitar buttons
- Approve (green `#15803D`) / Reject (red `#DC2626`) buttons with `minHeight: 44px` touch targets
- Optimistic UI: destination removed from list immediately on click
- Error rollback: re-inserts destination at top if PATCH fails
- Toast notifications (4s auto-dismiss): success green, error red
- Shimmer skeleton loading (3 placeholder rows)
- Empty state: "Nenhum destino pendente. Todos os destinos foram revisados."
- Error state with "Tentar novamente" retry button

## Deviations from Plan

### Auto-added: API proxy routes
- **Found during:** Task 2
- **Issue:** Plan referenced `GET /admin/destinations/pending` and `PATCH /destinations/:id/approve` but no Next.js proxy routes existed. The generic `/api/proxy` only allows `/tenants/*` paths.
- **Fix:** Created two new proxy routes under `/api/admin/destinations/`
- **Files:** `apps/web/app/api/admin/destinations/pending/route.ts`, `apps/web/app/api/admin/destinations/[id]/approve/route.ts`
- **Rule:** Rule 3 (blocking issue)

### Simplification: Reject without reason modal
- Plan mentioned "Rejeitar" button. The operadoras pattern uses a modal with rejection reason.
- Destinations rejection implemented without reason input (simpler, MVP-appropriate).
- Consistent with plan's acceptance criteria which only required PATCH with `approvalStatus: 'REJECTED'`.

### Task 4 (filtering/sorting) skipped
- Plan marked this as "optional for MVP". Not implemented. Can be added in v1.1.

### Task 5 (tests) skipped
- Jest not configured in the web app. No test infrastructure exists. Deferred.

## Commits

| Hash | Message |
|------|---------|
| `299546c` | feat(14-07): add Destinos nav to super-admin layout |
| `964579f` | feat(14-07): add API proxy routes for admin destination approval |
| `0262189` | feat(14-07): create super-admin destination approval queue page |

## Self-Check

- [x] `apps/web/app/super-admin/layout.tsx` — contains "Destinos" and "/super-admin/destinos"
- [x] `apps/web/app/super-admin/destinos/page.tsx` — contains "Aprovar", "Rejeitar", "approvalStatus", "PENDING"
- [x] `apps/web/app/api/admin/destinations/pending/route.ts` — created
- [x] `apps/web/app/api/admin/destinations/[id]/approve/route.ts` — created
- [x] All 3 commits verified in git log

## Self-Check: PASSED
