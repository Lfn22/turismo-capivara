---
phase: 19-confiabilidade-operacional
plan: "03"
subsystem: destinations-api
tags: [ops-05, schema-migration, rejection-reason, tdd]
dependency_graph:
  requires: []
  provides: [rejectionReason-field, createdAt-in-listing]
  affects: [destinations.service, destinations.routes, destinations.schemas, prisma-schema]
tech_stack:
  added: []
  patterns: [tdd-red-green, prisma-db-push, optional-param-defaulting-null]
key_files:
  created: []
  modified:
    - apps/api/prisma/schema.prisma
    - apps/api/src/modules/destinations/destinations.service.ts
    - apps/api/src/modules/destinations/destinations.routes.ts
    - apps/api/src/modules/destinations/destinations.schemas.ts
    - apps/api/src/modules/destinations/destinations.routes.test.ts
decisions:
  - "rejectionReason ?? null — usar null explícito em vez de undefined para garantir clear no banco"
  - "Teste antigo atualizado para refletir shape correta do update (Rule 1 auto-fix)"
metrics:
  duration: "~4 min"
  completed: "2026-06-26"
  tasks_completed: 2
  files_modified: 5
---

# Phase 19 Plan 03: OPS-05 Backend — rejectionReason no Destination Summary

Schema migrado, service atualizado para persistir motivo de rejeição, endpoint de listagem expõe `createdAt` e `rejectionReason` por destino.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Adicionar rejectionReason ao schema Prisma e migrar | 2768203 | schema.prisma |
| 2 RED | Testes falhos para rejectionReason persistence | 5cca372 | destinations.routes.test.ts |
| 2 GREEN | Service + routes + schemas atualizados | 66611db | service, routes, schemas, test |

## What Was Built

- `rejectionReason String?` adicionado ao model `Destination` em `schema.prisma`
- `prisma db push` aplicado — coluna criada no banco Railway (sem breaking change)
- `rejectDestination(id, reason?)` aceita segundo parâmetro opcional; persiste `reason ?? null`
- `ApprovalUpdateInput.rejectionReason` recebeu `.max(500)` (mitigação T-19-07)
- PATCH `/destinations/:id/approve` passa `input.rejectionReason` ao service
- GET `/tenants/:slug/destinations` select incluiu `rejectionReason: true` e `createdAt: true`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Teste existente quebrado pela mudança de assinatura**
- **Found during:** Task 2 GREEN
- **Issue:** Teste `transitions PENDING → REJECTED` verificava `data: { approvalStatus: 'REJECTED' }` exatamente — a adição de `rejectionReason: null` causou falha
- **Fix:** Atualizado para `data: { approvalStatus: 'REJECTED', rejectionReason: null }` refletindo o novo comportamento correto
- **Files modified:** destinations.routes.test.ts
- **Commit:** 66611db

## TDD Gate Compliance

- RED commit: `5cca372` — 3 testes falhos adicionados (rejectionReason com motivo, sem motivo, max 500 chars)
- GREEN commit: `66611db` — todos 3 passam; suite destinations.routes verde (180 passed no total, 12 falhos são pré-existentes de outros módulos)

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Ameaça T-19-07 (Tampering via rejectionReason) mitigada com `.max(500)` no schema Zod.

## Self-Check

- [x] `rejectionReason String?` em schema.prisma — FOUND
- [x] `rejectionReason: reason ?? null` em destinations.service.ts — FOUND
- [x] `rejectionReason: true` em destinations.routes.ts — FOUND
- [x] `createdAt: true` em destinations.routes.ts — FOUND
- [x] `.max(500)` em destinations.schemas.ts — FOUND
- [x] Commit 2768203 — schema
- [x] Commit 5cca372 — RED tests
- [x] Commit 66611db — GREEN implementation

## Self-Check: PASSED
