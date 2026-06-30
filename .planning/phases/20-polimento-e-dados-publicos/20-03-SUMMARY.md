---
phase: "20"
plan: "03"
subsystem: web/booking
tags: [tenant-approval, booking-guard, public-api, ux]
dependency_graph:
  requires: []
  provides: [tenant-status-api, booking-page-guard]
  affects: [apps/web/app/[slug]/(public)/reservar/page.tsx]
tech_stack:
  added: []
  patterns: [fail-open, status-guard, client-side-fetch]
key_files:
  created:
    - apps/web/app/api/tenants/[slug]/status/route.ts
  modified:
    - apps/api/src/modules/tenants/tenants.routes.ts
    - apps/web/app/[slug]/(public)/reservar/page.tsx
decisions:
  - "Fail-open em erro de rede: formulário aparece mesmo sem confirmar status (evita bloquear tenants APPROVED por instabilidade)"
  - "GET /tenants/:slug atualizado para incluir approvalStatus na resposta pública (campo não sensível)"
  - "Mensagem genérica sem revelar PENDING vs REJECTED — apenas 'não está disponível no momento'"
metrics:
  duration: "3min"
  completed: "2026-06-30T12:59:50Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 2
---

# Phase 20 Plan 03: Reservar — Guard de Tenant APPROVED Summary

**One-liner:** Guard client-side na página /reservar que verifica approvalStatus via API proxy e substitui formulário por mensagem genérica quando tenant não está APPROVED.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Criar API route pública para verificar status do tenant | fd2f99f | apps/web/app/api/tenants/[slug]/status/route.ts, apps/api/src/modules/tenants/tenants.routes.ts |
| 2 | Verificar tenant APPROVED na página de reserva e exibir mensagem inline | 49078c3 | apps/web/app/[slug]/(public)/reservar/page.tsx |

## What Was Built

- `GET /tenants/:slug` (API Fastify) agora inclui `approvalStatus` na resposta pública
- `apps/web/app/api/tenants/[slug]/status/route.ts` — proxy Next.js que retorna apenas `{ approvalStatus }`, sem outros campos do tenant
- `reservar/page.tsx` — verificação client-side ao montar: `useEffect` busca status, exibe mensagem genérica ou formulário conforme resultado

## Behavior

- **Tenant APPROVED:** formulário de reserva aparece normalmente
- **Tenant PENDING/REJECTED:** mensagem "Este roteiro não está disponível para reservas no momento." + link "Explorar outros destinos →" para /destinos
- **Erro de rede:** fail-open — formulário aparece (não bloqueia tenants APPROVED por instabilidade)
- **Status loading:** retorna `null` (sem flash de conteúdo)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Adicionado approvalStatus na resposta de GET /tenants/:slug**
- **Found during:** Task 1
- **Issue:** Rota pública `GET /tenants/:slug` existia mas não retornava `approvalStatus` — a API route proxy retornaria sempre `null` (fail-open permanente, tornando o guard ineficaz)
- **Fix:** Adicionado `approvalStatus: tenant.approvalStatus` na resposta de `GET /tenants/:slug` em `tenants.routes.ts`
- **Files modified:** apps/api/src/modules/tenants/tenants.routes.ts
- **Commit:** fd2f99f

## Threat Surface Scan

Nenhuma nova superfície de ataque além do previsto no threat model do plano.

| Flag | File | Description |
|------|------|-------------|
| T-20-04 mitigado | apps/web/app/api/tenants/[slug]/status/route.ts | Retorna apenas `{ approvalStatus }` — sem nome, email, ID ou dados sensíveis do tenant |
| T-20-05 mitigado | apps/web/app/[slug]/(public)/reservar/page.tsx | Mensagem genérica — não revela PENDING vs REJECTED |

## Self-Check

- [x] `apps/web/app/api/tenants/[slug]/status/route.ts` existe
- [x] `apps/web/app/[slug]/(public)/reservar/page.tsx` contém "Este roteiro não está disponível para reservas no momento."
- [x] `apps/web/app/[slug]/(public)/reservar/page.tsx` contém link `/destinos`
- [x] Commits fd2f99f e 49078c3 existem no git log
