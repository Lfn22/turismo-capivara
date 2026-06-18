## Plan 17-01: Schema — cancelToken + ProcessedWebhookEvent

**Status:** Complete
**Phase:** 17-seguranca-e-dados
**Plan:** 01

## Tasks completed

- Task 1: Adicionar cancelToken ao Booking e criar ProcessedWebhookEvent no schema.prisma
- Task 2: Criar e aplicar migration com backfill de cancelToken

## Files modified

- `apps/api/prisma/schema.prisma` — cancelToken String @unique adicionado ao Booking; modelo ProcessedWebhookEvent criado
- `apps/api/prisma/migrations/20260618000001_add_cancel_token_and_webhook_dedup/migration.sql` — migration com ADD COLUMN, backfill gen_random_uuid(), NOT NULL constraint, CREATE TABLE ProcessedWebhookEvent

## Commits

- `3602948` feat(17-01): adicionar cancelToken ao Booking e modelo ProcessedWebhookEvent
- `8405836` feat(17-01): migration add_cancel_token_and_webhook_dedup com backfill

## Deviations

- **Abordagem de migration:** Ambiente Railway é não-interativo, então `prisma migrate dev --create-only` falhou com erro de ambiente interativo. Alternativa: migration criada manualmente no diretório correto e aplicada com `prisma migrate deploy`. SQL semanticamente idêntico ao plano. Resultado final idêntico ao esperado.

## Next Phase Readiness

Ready for Wave 2 (17-02 + 17-04) — cancelToken disponível no modelo Booking para ser preenchido no POST /bookings, e ProcessedWebhookEvent pronto para uso no webhook handler de deduplicação idempotente.

## Self-Check

- [x] `cancelToken String @unique` presente no modelo Booking (sem `?`)
- [x] `ProcessedWebhookEvent` com `id String @id` e `processedAt DateTime @default(now())`
- [x] `Database schema is up to date!`
- [x] migration.sql contém `UPDATE "Booking" SET "cancelToken" = gen_random_uuid()::text`
- [x] migration.sql contém `CREATE TABLE "ProcessedWebhookEvent"`
- [x] Commits 3602948 e 8405836 existem

**Self-Check: PASSED**
