# Plan 21-03 Summary

**Status:** Complete
**Goal:** Fastify server hardening (JWT, CORS, health check, genReqId, X-Request-Id)

## Tasks Completed

- **JWT expiresIn → '7d'**: Changed from `'1d'` to `'7d'` in `auth.routes.ts` jwtSign call
- **genReqId**: Added `genReqId: () => crypto.randomUUID()` to Fastify options (Node 22 built-in, no import needed)
- **connectionTimeout**: Added `connectionTimeout: 30000` to Fastify options
- **CORS PUT**: Added `'PUT'` to `methods` array in `@fastify/cors` registration
- **Health check DB probe**: Replaced stub with `prisma.$queryRaw\`SELECT 1\`` in try/catch; returns `{db:'ok'}` 200 on success, `{db:'error'}` 503 on failure (error detail logged server-side only, never leaked to HTTP response)
- **X-Request-Id header**: Added `onSend` hook that sets `reply.header('X-Request-Id', request.id)` on all responses

## Commits Made

- `6e3bfc6` — feat(21-03): extend JWT expiry from 1d to 7d
- `3828737` — feat(21-03): harden Fastify server — genReqId, CORS PUT, health DB probe, X-Request-Id

## Must-Have Verification

- JWT `expiresIn` is `'7d'` in `auth.routes.ts` — CONFIRMED (line 91)
- CORS accepts PUT method — CONFIRMED (`['GET', 'POST', 'PUT', 'PATCH', 'DELETE']`)
- GET /health returns `{db: 'ok'}` 200 when DB available — CONFIRMED (try block)
- GET /health returns `{db: 'error'}` 503 when DB unavailable — CONFIRMED (catch block, error only logged)
- Fastify instantiated with `genReqId` returning UUID v4 — CONFIRMED (`crypto.randomUUID()`)
- `onSend` hook sets X-Request-Id header on all responses — CONFIRMED
- `connectionTimeout: 30000` configured — CONFIRMED

## Deviations from Plan

**1. [Rule 3 - Blocking] Prisma import path corrected**
- Plan research referenced `./shared/prisma` but the actual prisma client is in `./database.ts` (singleton using `@prisma/adapter-pg`)
- Fixed to `(await import('./database')).default` — dynamic import used to avoid circular dependency risk at module load time
- Files modified: `apps/api/src/app.ts`
- Commit: `3828737`

## Issues Encountered

None beyond the prisma path correction above. TypeScript build (`tsc --noEmit`) passed with zero errors.
