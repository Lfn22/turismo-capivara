---
phase: 14-gestao-de-conteudo
plan: "01"
subsystem: database-schema
tags: [prisma, migration, schema, destination, tour-package]
dependency_graph:
  requires: []
  provides: [destination-approval-schema, destination-creator-fk, tour-package-media-fields]
  affects: [all-wave-2-api-routes, destination-crud, tour-package-crud]
tech_stack:
  added: []
  patterns: [prisma-migrate-dev, string-array-default, fk-set-null]
key_files:
  created:
    - apps/api/prisma/migrations/20260608174257_add_approval_status_and_created_by_destination/migration.sql
  modified:
    - apps/api/prisma/schema.prisma
decisions:
  - "Prisma gerou migration única para todos os campos (Destination + TourPackage) — comportamento normal do migrate dev ao processar schema com múltiplas alterações pendentes"
  - "createdById usa ON DELETE SET NULL — destinos não são deletados se o criador for removido"
  - "TourPackage.photos e highlights usam String[] nativo PostgreSQL, não JSON — consistente com padrão existente no Destination model"
metrics:
  duration: "2 minutes"
  completed_date: "2026-06-08"
  tasks_completed: 5
  files_changed: 2
---

# Phase 14 Plan 01: Schema Migrations for Destination Approval and Package Enrichment Summary

Prisma schema updated with destination approval workflow fields and TourPackage media arrays; single migration created and applied to Railway PostgreSQL.

## What Was Built

- `Destination.approvalStatus ApprovalStatus @default(PENDING)` — reutiliza enum existente
- `Destination.createdById String?` — FK para `User.id` com relação nomeada `DestinationCreator`
- `User.destinations Destination[] @relation("DestinationCreator")` — relação inversa
- `TourPackage.photos String[] @default([])` — array de URLs de fotos do R2
- `TourPackage.highlights String[] @default([])` — array de bullets de experiência
- Migration `20260608174257` aplicada com sucesso ao banco Railway

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add approvalStatus and createdById to Destination | 0c73c93 | schema.prisma |
| 2 | Add photos and highlights to TourPackage | f92a027 | schema.prisma |
| 3+4 | Create and apply migration (unified) | a0ff9dc | migrations/20260608174257/migration.sql |
| 5 | Validate schema and regenerate Prisma client | (no files) | node_modules/.prisma/client |

## Deviations from Plan

### Auto-observations

**Task 3+4 merged:** O plano previa duas migrations separadas (uma para Destination, outra para TourPackage). O Prisma `migrate dev` gerou uma migration unificada `20260608174257_add_approval_status_and_created_by_destination` contendo ALTER TABLE para ambos os modelos. Este é o comportamento padrão do Prisma ao processar múltiplas alterações de schema pendentes em uma única execução. Nenhum impacto funcional — todos os campos foram criados corretamente.

## Known Stubs

Nenhum. Este plano é exclusivamente de schema/migrations — sem UI ou lógica de negócio.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: fk-set-null | migration.sql | Destination_createdById_fkey usa SET NULL — destinos sobrevivem à deleção do criador; API routes Wave 2 devem verificar autorização antes de mutações |

## Self-Check

Arquivos criados:
- apps/api/prisma/migrations/20260608174257_add_approval_status_and_created_by_destination/migration.sql — FOUND

Commits:
- 0c73c93 — FOUND
- f92a027 — FOUND
- a0ff9dc — FOUND

Schema validation: `npx prisma validate` retornou "The schema at prisma\schema.prisma is valid"
Prisma generate: retornou "Generated Prisma Client (v7.7.0)"

## Self-Check: PASSED
