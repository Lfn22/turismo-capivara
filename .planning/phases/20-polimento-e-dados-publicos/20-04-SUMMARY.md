---
phase: 20-polimento-e-dados-publicos
plan: "04"
subsystem: super-admin
tags: [pagination, load-more, tenants-api, super-admin]
dependency_graph:
  requires: []
  provides: [paginated-tenants-api, load-more-destinos, load-more-operadoras]
  affects: [apps/api/src/modules/tenants/tenants.routes.ts, apps/web/app/super-admin]
tech_stack:
  added: []
  patterns: [append-pagination, load-more-button, prisma-take-skip]
key_files:
  created: []
  modified:
    - apps/api/src/modules/tenants/tenants.routes.ts
    - apps/web/app/api/super-admin/tenants/pending/route.ts
    - apps/web/app/super-admin/destinos/page.tsx
    - apps/web/app/super-admin/operadoras/page.tsx
decisions:
  - "Botão some quando API retorna < 20 itens (list.length === 20 como proxy de hasMore)"
  - "Erro no loadMore é silencioso — botão permanece para nova tentativa"
  - "Proxy route repassa limit/offset como query string strings para a API Fastify"
metrics:
  duration: "~10min"
  completed_date: "2026-06-30"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 20 Plan 04: Paginação "Carregar Mais" no Super-Admin — Summary

**One-liner:** Paginação append de 20 itens com botão "Carregar mais" nas páginas super-admin de destinos e operadoras, e API de tenants pendentes com limit/offset e resposta paginada.

## Tasks Executadas

| Task | Nome | Commit | Arquivos |
|------|------|--------|---------|
| 1 | API de tenants pendentes + proxy route | 96b69be | tenants.routes.ts, pending/route.ts |
| 2 | "Carregar mais" em destinos e operadoras | 75ac55d | destinos/page.tsx, operadoras/page.tsx |

## O que foi feito

**Task 1 — API Fastify + proxy Next.js:**
- `GET /tenants/admin/pending` agora aceita `?limit` (1–100, default 20) e `?offset` (default 0)
- Resposta mudou de array plano `Tenant[]` para `{ tenants, total, limit, offset }`
- `prisma.tenant.count` adicionado para retornar total (rodada em paralelo com `findMany`)
- Proxy route Next.js (`apps/web/app/api/super-admin/tenants/pending/route.ts`) agora lê `searchParams` e repassa `limit` e `offset` para a API

**Task 2 — Páginas super-admin:**
- Ambas as páginas ganham estados: `offset`, `hasMore`, `loadingMore`
- `loadDestinations()` / `loadTenants()` reiniciam offset=0 e substituem o state (carga inicial)
- `loadMore()` faz append em `setDestinations((prev) => [...prev, ...list])` / `setItems((prev) => [...prev, ...list])`
- Botão "Carregar mais" some quando `list.length < 20` (sem mais itens)
- `destinos/page.tsx` mudou de `limit=50` para `limit=20`
- `operadoras/page.tsx` adaptado ao novo formato `data.tenants ?? []`

## Deviações do Plano

Nenhuma — plano executado exatamente como escrito.

## Threat Surface Scan

Sem novos endpoints ou caminhos de auth. Threat model T-20-07 (preHandler SUPER_ADMIN) inalterado; T-20-08 (max 100) implementado via `z.coerce.number().int().min(1).max(100)`.

## Known Stubs

Nenhum.

## Self-Check

- [x] `apps/api/src/modules/tenants/tenants.routes.ts` — `take: query.limit`, `skip: query.offset`, `prisma.tenant.count`, `{ tenants, total, limit, offset }`
- [x] `apps/web/app/api/super-admin/tenants/pending/route.ts` — `searchParams.get("limit")`, `searchParams.get("offset")`, URL com `?limit=${limit}&offset=${offset}`
- [x] `apps/web/app/super-admin/destinos/page.tsx` — "Carregar mais", `hasMore`, `setHasMore(list.length === 20)`, `setDestinations((prev) => [...prev, ...list])`, `limit=20`
- [x] `apps/web/app/super-admin/operadoras/page.tsx` — "Carregar mais", `setItems((prev) => [...prev, ...list])`, `data.tenants ?? []`
- [x] Commits 96b69be e 75ac55d existem no git log

## Self-Check: PASSED
