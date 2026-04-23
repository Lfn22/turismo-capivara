---
phase: "02"
plan: "01"
subsystem: schema
tags: [prisma, schema, migration, guide-profile, approval-status]
dependency_graph:
  requires: []
  provides: [GuideProfile model, ApprovalStatus enum, User.approvalStatus, User.cpf, User.updatedAt]
  affects: [02-02, 02-03, 02-04]
tech_stack:
  added: []
  patterns: [Prisma nullable field extension, 1-1 relation via @unique FK]
key_files:
  created:
    - apps/api/prisma/migrations/20260423204900_add_guide_profile_and_approval_status/migration.sql
  modified:
    - apps/api/prisma/schema.prisma
decisions:
  - "GuideProfile has no tenantId — tenant access always via User.tenantId to avoid join duplication"
  - "Migration SQL created manually (local DB unavailable); ready for prisma migrate deploy on Railway"
  - "updatedAt on User uses @updatedAt so Prisma manages it automatically"
metrics:
  duration: "3m 24s"
  completed: "2026-04-23"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
requirements:
  - AUTH-02
  - GUIDE-01
  - GUIDE-04
---

# Phase 2 Plan 01: Prisma Schema Extension for Guide Onboarding Summary

**One-liner:** Added ApprovalStatus enum + GuideProfile model + User guide fields (cpf, approvalStatus, rejectionReason, updatedAt) to enable guide registration and admin approval flow.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend schema.prisma with ApprovalStatus, User fields, GuideProfile | e9fba65 | apps/api/prisma/schema.prisma |
| 2 | Generate migration SQL and regenerate Prisma Client | c06a98d | apps/api/prisma/migrations/.../migration.sql |

## What Was Built

**schema.prisma extensions:**
- `User` model: added `cpf String?`, `approvalStatus ApprovalStatus @default(PENDING)`, `rejectionReason String?`, `updatedAt DateTime @updatedAt`, and `guideProfile GuideProfile?` relation
- New `GuideProfile` model: `userId @unique` (1-1 with User), `bio`, `photoUrl`, `especialidades String[]`, `regioes String[]`, `portfolioPhotos String[]`, timestamps
- New `ApprovalStatus` enum: `PENDING`, `APPROVED`, `REJECTED`

**Migration:**
- SQL file created at `apps/api/prisma/migrations/20260423204900_add_guide_profile_and_approval_status/migration.sql`
- Prisma Client regenerated — `ApprovalStatus` and `GuideProfile` types available in `@prisma/client`
- `npx tsc --noEmit` passes with zero errors

## Verification Results

- `npx prisma validate`: PASSED — schema valid
- `npx tsc --noEmit`: PASSED — zero type errors
- `grep model GuideProfile schema.prisma`: line 40 found
- `grep enum ApprovalStatus schema.prisma`: line 120 found
- `User.approvalStatus @default(PENDING)`: line 29 confirmed
- `User.updatedAt @updatedAt`: line 32 confirmed

## Deviations from Plan

### Auto-handled: DB unavailable

**Found during:** Task 2
**Issue:** Local PostgreSQL not running at localhost:5432 (P1001). `prisma migrate dev` failed.
**Fix:** Per plan instructions — migration SQL created manually with correct DDL, Prisma Client regenerated via `npx prisma generate`. Migration file committed and ready for `prisma migrate deploy` on Railway or `prisma migrate dev` when local DB is started.
**Files modified:** apps/api/prisma/migrations/20260423204900_add_guide_profile_and_approval_status/migration.sql
**Commit:** c06a98d

## Known Stubs

None — this plan only modifies schema/migration with no UI or API response layer.

## Threat Surface Scan

No new network endpoints introduced. CPF field added as nullable — enforcement that CPF is never returned in public responses is deferred to plans 02-02 and 02-04 per T-02-01-02 threat register entry.

## Self-Check: PASSED

- apps/api/prisma/schema.prisma: FOUND
- apps/api/prisma/migrations/20260423204900_add_guide_profile_and_approval_status/migration.sql: FOUND
- Commit e9fba65: FOUND
- Commit c06a98d: FOUND
