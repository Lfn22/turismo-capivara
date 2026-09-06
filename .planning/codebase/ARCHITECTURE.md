# Architecture — turismo-capivara

> Last mapped: 2026-09-06

## Pattern

**Monorepo + Modular Monolith**

- pnpm workspace with Turborepo orchestration
- API: Fastify modular plugin architecture
- Web: Next.js App Router with server/client components
- Shared nothing between apps (no shared packages yet)

## Multi-Tenant Design

All entities scoped to a `Tenant`, isolated by `slug` in URL params.

```
URL: /[slug]/roteiros → Tenant resolved from slug
JWT: contains tenantId → cross-tenant check in authenticate middleware
```

**Roles:** ADMIN, ATENDENTE, CONDUTOR (guide), CLIENTE (tourist), SUPER_ADMIN

## API Layers

```
Request → Fastify Route Plugin
  → Middleware (authenticate → authorize)
  → Route Handler (inline in routes file)
  → Prisma Client (database.ts singleton)
  → Response
```

**Key pattern:** Routes are Fastify plugins registered in `app.ts`. Each module exports a plugin function. Business logic lives directly in route handlers — no separate service layer for most modules.

**Exceptions with service layer:**
- `apps/api/src/services/payment.service.ts` — Mercado Pago abstraction
- `apps/api/src/modules/packages/packages.service.ts`
- `apps/api/src/modules/destinations/destinations.service.ts`
- `apps/api/src/modules/uploads/uploads.service.ts`

## Entry Points

- **API:** `apps/api/src/app.ts` — builds Fastify app, registers plugins (cors, helmet, jwt, rate-limit, cron, raw-body), registers route modules, starts server
- **API server:** `apps/api/src/server.ts` — thin wrapper, imports app
- **Web:** `apps/web/app/layout.tsx` — Next.js root layout

## Data Flow — Booking

```
Tourist → Web (checkout page)
  → Next.js API route (proxy)
  → Fastify /bookings POST
  → Prisma $transaction (anti-overbooking)
  → Mercado Pago PIX creation
  → Response with paymentUrl + qrCode
  → Webhook confirms payment
  → Email sent via Resend
  → Voucher generated
```

## Data Flow — Auth

```
Login → Web (next-auth)
  → API /auth/login
  → bcrypt verify
  → JWT signed with tenantId, userId, role
  → Stored client-side via next-auth session
```

## Plugin Registration Order (app.ts)

1. `validateEnv()` + `initSentry()` (before Fastify creation)
2. Fastify instance created
3. `Sentry.setupFastifyErrorHandler(app)` (before custom error handler)
4. `rawBody` plugin
5. `cors` plugin
6. `helmet` plugin
7. `rateLimit` plugin
8. `jwt` plugin
9. `fastifyCron` plugin
10. Route modules (tenants, packages, bookings, auth, users, dashboard, webhooks, uploads, guides, destinations)
11. Custom `setErrorHandler` — catches `AppError` and Zod errors
12. Server listen

## Error Handling

- `AppError` class: `apps/api/src/shared/errors/AppError.ts` — `message` + `statusCode`
- Global error handler in `app.ts` — returns `{ message }` field
- Error messages in Portuguese (PT-BR)
- Zod validation errors caught and formatted in global handler
