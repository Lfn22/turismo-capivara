# Concerns & Technical Debt

**Analysis Date:** 2026-04-17

## High Severity

**1. Booking PATCH endpoints have no authentication**
`PATCH /cancel` and `PATCH /confirm` in `apps/api/src/modules/bookings/bookings.routes.ts` have zero middleware. Any anonymous caller can cancel or confirm any booking by ID.

**2. No input validation anywhere**
Every route body uses TypeScript `as { ... }` casting with no runtime validation. Missing `pax`, empty `email`, etc. silently reach the database.

**3. Cross-tenant slot injection**
`POST /tenants/:slug/bookings` accepts any `slotId` without verifying it belongs to the route's tenant. A slot from Tenant B can be consumed via Tenant A's endpoint.

**4. Hardcoded fallback JWT secret**
`apps/api/src/app.ts`: `?? 'desenvolvimento-secret-trocar-em-producao'`. If `JWT_SECRET` is unset, all tokens are forgeable.

**5. CORS locked to `localhost:3000`**
`apps/api/src/app.ts`. The deployed production frontend is blocked by CORS.

**6. `@fastify/helmet` installed but never registered**
Listed in `package.json`, never imported in `app.ts`. No HTTP security headers are sent.

## Medium Severity

**7. No rate limiting on auth or booking endpoints**
Login and public booking routes are unbounded, enabling brute-force attacks and slot exhaustion.

**8. Booking cancel blindly resets slot to `OPEN`**
Does not check whether the slot was `CANCELLED` or `COMPLETED` first.

**9. `authorize` middleware does not validate JWT tenant against route tenant**
An ADMIN from Tenant A can read Tenant B's bookings.

**10. Duplicate divergent middleware files**
`apps/api/src/shared/errors/middlewares/` is dead code that nearly mirrors `apps/api/src/shared/middlewares/`, with slightly different error messages.

**11. Dead duplicate page**
`apps/web/app/roteiros/slug/page.tsx` is an older Tailwind-based version of `apps/web/app/roteiros/detalhe/page.tsx`. Uses a different booking URL format.

**12. Tenant slug hardcoded in 5+ frontend files**
`"serra-viva"` is hardcoded throughout the frontend. The multi-tenant API design is bypassed entirely by the web client.

**13. `Voucher` model defined in schema but never implemented**
Defined in `schema.prisma` but never created anywhere in the source. `Voucher.pdfUrl` and homepage copy mentioning Pix/WhatsApp indicate planned features not yet built.

**14. Redis in `docker-compose.yml` but never used**
No Redis client dependency exists anywhere in the codebase.

**15. `GET /tenants` exposes all tenants without authentication.**

## Low Severity

**16. No pagination on `GET /tenants/:slug/bookings`**
Unbounded `findMany()`.

**17. Seed uses hardcoded `senha123` with no production guard**
`apps/api/prisma/seed.ts`.

**18. `schema.prisma` datasource has no `url` field**
Relies on `prisma.config.ts`; confusing for contributors expecting standard Prisma conventions.

**19. Two `.env` example files in `apps/web/`**
`.env.example` and `.env.exemple` (typo); both identical.

**20. Empty `packages/` and root `src/` directories**
Dead scaffolding in the repo.

**21. Zero tests in the entire codebase**
No test runner configured, no test files exist.

**22. `AppError` class defined but never used**
`apps/api/src/shared/errors/AppError.ts` is dead code; routes use raw string-thrown errors instead.
