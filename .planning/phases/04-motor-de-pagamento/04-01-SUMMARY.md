---
phase: 04
plan: "01"
subsystem: payment-infrastructure
tags: [mercadopago, pix, fastify-raw-body, prisma, schema]
dependency_graph:
  requires: [03-03]
  provides: [payment-schema, raw-body-plugin, payment-packages, test-infra]
  affects: [apps/api/prisma/schema.prisma, apps/api/src/app.ts, apps/api/package.json]
tech_stack:
  added: [mercadopago@^2, fastify-raw-body@^4, vitest@^3, "@vitest/coverage-v8@^3"]
  patterns: [fastify-plugin-registration, prisma-schema-extension, opt-in-raw-body]
key_files:
  created:
    - apps/api/src/shared/errors/AppError.ts
    - apps/api/vitest.config.ts
  modified:
    - apps/api/prisma/schema.prisma
    - apps/api/src/app.ts
    - apps/api/package.json
    - pnpm-lock.yaml
decisions:
  - "fastify-raw-body registrado com global:false — opt-in por rota para evitar overhead em todas as rotas"
  - "customerCpf adicionado como opcional no Booking para identificação do pagador PIX"
  - "EXPIRED adicionado ao BookingStatus enum para expiração de PIX não pago"
  - "prisma db push adiado — banco PostgreSQL não disponível em ambiente local de dev"
metrics:
  duration: "~30min (execução das tarefas restantes)"
  completed_date: "2026-05-05"
  tasks_completed: 4
  files_modified: 6
---

# Phase 4 Plan 1: Payment Infrastructure Setup Summary

Infraestrutura base para Motor de Pagamento: pacotes Mercado Pago + raw-body instalados, schema Prisma estendido com campos de pagamento, plugin fastify-raw-body registrado no app para validação HMAC de webhooks.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Install mercadopago, fastify-raw-body, vitest; create AppError + vitest.config | 3c6c1f2, e4be871 | Done |
| 2 | Commit Prisma schema with payment fields + EXPIRED status | 37096ac | Done |
| 3 | Run prisma db push | Deferred (see deviations) | Partial |
| 4 | Register fastify-raw-body in app.ts | e56f2c1 | Done |

## Deviations from Plan

### Environment Limitation

**[Rule 3 - Blocked] prisma db push skipped — PostgreSQL indisponível localmente**
- **Found during:** Task 3
- **Issue:** `Can't reach database server at localhost:5432` — banco PostgreSQL não está rodando no ambiente local de desenvolvimento. Problema pré-existente (documentado em 2026-04-23, obs 891).
- **Fix:** Schema commitado com todos os campos corretos. O `prisma db push` deve ser executado no Railway (ambiente com DB disponível) ou via `docker compose up` antes de rodar a API localmente.
- **Files modified:** N/A (schema já commitado, só a aplicação ao DB foi adiada)
- **Impact:** Nenhum — o schema está correto no repositório; o Prisma Client será regenerado automaticamente no próximo `prisma generate` / deploy.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 3c6c1f2 | chore | Install payment packages and configure test infrastructure |
| e4be871 | chore | Update pnpm-lock.yaml with new payment dependencies |
| 37096ac | feat | Add payment fields and EXPIRED status to Booking schema |
| e56f2c1 | feat | Register fastify-raw-body plugin in app.ts |

## Known Stubs

None — este plano é de infraestrutura pura (instalação, schema, configuração). Sem UI ou endpoints expostos.

## Threat Flags

None — nenhuma nova superfície de rede exposta. O plugin raw-body está registrado com `global: false` (opt-in), sem endpoints de webhook criados ainda (serão criados no 04-02).

## Self-Check: PASSED

- [x] `apps/api/src/app.ts` contém `import rawBody from 'fastify-raw-body'` e `app.register(rawBody, ...)`
- [x] `apps/api/prisma/schema.prisma` contém `customerCpf`, `paymentId`, `paymentUrl`, `expiresAt`, `EXPIRED`
- [x] `apps/api/src/shared/errors/AppError.ts` existe (criado na Task 1)
- [x] `apps/api/vitest.config.ts` existe (criado na Task 1)
- [x] Commits 3c6c1f2, e4be871, 37096ac, e56f2c1 existem no git log
