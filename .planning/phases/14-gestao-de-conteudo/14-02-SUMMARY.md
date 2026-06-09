---
phase: 14-gestao-de-conteudo
plan: "02"
subsystem: destinations-api
tags: [fastify, prisma, zod, ownership, crud, jwt]
dependency_graph:
  requires: [destination-approval-schema, destination-creator-fk]
  provides: [destination-crud-api, destination-ownership-enforcement]
  affects: [wave-2-ui, super-admin-approval-wave3]
tech_stack:
  added: []
  patterns: [zod-v4-enum, service-layer-ownership, jwt-sub-user-id, slug-uniqueness]
key_files:
  created:
    - apps/api/src/modules/destinations/destinations.schemas.ts
    - apps/api/src/modules/destinations/destinations.service.ts
    - apps/api/src/modules/destinations/destinations.routes.test.ts
  modified:
    - apps/api/src/modules/destinations/destinations.routes.ts
decisions:
  - "input field named 'name' maps to DB field 'title' in service layer — keeps API semantic (name) consistent with plan spec while matching existing DB schema"
  - "Zod v4 uses 'error' param instead of 'errorMap' for enum messages — fixed in schemas.ts"
  - "JWT user identity uses request.user.sub (not .id) — consistent with existing users.routes.ts pattern"
  - "Tests are unit-level with Prisma mocked — no integration DB required; all 29 pass"
metrics:
  duration: "8 minutes"
  completed_date: "2026-06-09"
  tasks_completed: 4
  files_changed: 4
---

# Phase 14 Plan 02: Destination CRUD API with Ownership Enforcement Summary

Destination CRUD API implemented with Zod validation, service-layer ownership checks, and 29 passing tests; guides can create PENDING destinations, edit/delete only their own, and cannot touch APPROVED destinations.

## What Was Built

- `destinations.schemas.ts`: CreateDestinationInput (name, description, 27-state enum, photos, highlights), UpdateDestinationInput (all optional + at-least-one refine), ApprovalUpdateInput (Wave 3 admin)
- `destinations.service.ts`: createDestination (slugify, slug uniqueness, PENDING default, createdById), updateDestination (ownership 403, APPROVED lock 400), deleteDestination (ownership 403)
- `destinations.routes.ts`: POST/PATCH/DELETE routes under `/tenants/:slug/destinations` with auth middleware
- `destinations.routes.test.ts`: 29 tests covering schema validation, service ownership logic, APPROVED edit lock

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create destinations.schemas.ts with Zod validation | 1bc96e7 | destinations.schemas.ts |
| 2 | Create destinations.service.ts with ownership checks | 7cac5ae | destinations.service.ts |
| 3 | Expand destinations.routes.ts with POST/PATCH/DELETE | 64b0bd1 | destinations.routes.ts, destinations.schemas.ts |
| 4 | Integration tests for destination CRUD | 555512b | destinations.routes.test.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 enum API change: errorMap → error**
- **Found during:** Task 3 (TypeScript build)
- **Issue:** `z.enum(values, { errorMap: ... })` fails in Zod v4 — API renamed to `{ error: ... }`
- **Fix:** Updated all 3 enum usages in destinations.schemas.ts
- **Files modified:** destinations.schemas.ts
- **Commit:** 64b0bd1

**2. [Rule 1 - Bug] JWT user identity: request.user.id → request.user.sub**
- **Found during:** Task 3 (TypeScript build)
- **Issue:** JWT payload uses `sub` for user id, not `id` — consistent with users.routes.ts
- **Fix:** Changed `request.user.id` to `request.user.sub` in 3 route handlers
- **Files modified:** destinations.routes.ts
- **Commit:** 64b0bd1

**3. [Rule 2 - Design] input 'name' maps to DB 'title'**
- **Found during:** Task 2 (service implementation)
- **Issue:** Plan spec uses 'name' field but Destination model has 'title' column
- **Fix:** Service layer maps input.name → data.title (API semantic preserved, DB schema respected)
- **Files modified:** destinations.service.ts

## Known Stubs

Nenhum. Este plano é de API pura — sem UI. Dados são reais e persistem no banco.

## Threat Flags

Nenhum novo. Todas as mitigações do threat model foram implementadas:
- T-14-05: Zod enum enforces 27-state whitelist
- T-14-06: updateDestination checks createdById === userId
- T-14-07: deleteDestination checks createdById === userId
- T-14-08: approvalStatus stripped from CreateDestinationInput (Zod unknown fields behavior)

## Self-Check

Arquivos criados:
- apps/api/src/modules/destinations/destinations.schemas.ts — FOUND
- apps/api/src/modules/destinations/destinations.service.ts — FOUND
- apps/api/src/modules/destinations/destinations.routes.test.ts — FOUND

Commits:
- 1bc96e7 — FOUND
- 7cac5ae — FOUND
- 64b0bd1 — FOUND
- 555512b — FOUND

Tests: 29 passed, 0 failed

## Self-Check: PASSED
