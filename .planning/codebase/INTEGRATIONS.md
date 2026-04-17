# External Integrations

**Analysis Date:** 2026-04-17

## APIs & External Services

**Internal REST API:**
- The web app (`apps/web`) calls the API (`apps/api`) via `fetch`
  - Base URL: `process.env.NEXT_PUBLIC_API_URL` (e.g. `https://sua-api.railway.app`)
  - Server-side calls use `next: { revalidate: 300 }` for ISR caching (e.g. `app/roteiros/page.tsx`)
  - Client-side calls store JWT in `localStorage` and pass it in `Authorization` header

**Google Fonts:**
- Loaded via `next/font/google` in `apps/web/app/layout.tsx`
  - `Playfair_Display` (CSS variable `--font-playfair`)
  - `Source_Sans_3` (CSS variable `--font-source`)
  - Self-hosted at build time by Next.js; no runtime external call

## Data Storage

**Primary Database:**
- PostgreSQL
  - Version used in dev: PostgreSQL 16 (via `docker-compose.yml`)
  - Connection: `DATABASE_URL` env var (format: `postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public`)
  - Client: Prisma 7.5.0 with `@prisma/adapter-pg` (native pg driver adapter)
  - Schema: `apps/api/prisma/schema.prisma`
  - Migrations: `apps/api/prisma/migrations/` (2 applied: `init`, `add_password_to_user`)
  - Migrations run automatically at container startup: `npx prisma migrate deploy`

**Caching / Queue:**
- Redis 7-alpine is declared in `docker-compose.yml` (port 6379)
- **Not integrated in application code** — no Redis client package in `apps/api/package.json` or `apps/web/package.json`
- Listed for future use only

**File Storage:**
- None configured. The `Voucher` model in `schema.prisma` has a `pdfUrl String?` field, but no file storage service (S3, Cloudinary, etc.) is implemented yet.

## Authentication & Identity

**Auth Provider:**
- Custom (no third-party auth service)
  - Implementation: email + password + `tenantSlug` login in `apps/api/src/modules/auth/auth.routes.ts`
  - Passwords hashed with bcryptjs; compared with `compareSync`
  - On success: JWT issued via `@fastify/jwt`, 1-day expiry
  - JWT payload: `{ sub: userId, tenantId, role, name }`
  - Verification middleware: `apps/api/src/shared/middlewares/authenticate.ts` calls `request.jwtVerify()`
  - Authorization middleware: `apps/api/src/shared/middlewares/authorize.ts` checks `role` claim
  - Token storage on the frontend: `localStorage` (`apps/web/app/dashboard/page.tsx`)
  - Multi-tenant: each user belongs to a `Tenant`, identified by `tenantSlug` at login

## Monitoring & Observability

**Error Tracking:**
- None configured (no Sentry, Datadog, or similar)

**Logs:**
- Fastify built-in logger (`Fastify({ logger: true })` in `apps/api/src/app.ts`)
- Prisma query logging enabled: `log: ['query', 'error', 'warn']` in `apps/api/src/database.ts`
- Frontend: `console.error` for API/fetch failures in web pages

## CI/CD & Deployment

**Hosting:**
- Railway — API deployment target (referenced in `.env.example`: `https://sua-api.railway.app`)
- Web frontend deployment target: not explicitly configured (no `vercel.json`, `netlify.toml`, etc.)

**CI Pipeline:**
- None detected (no `.github/workflows/`, no CircleCI, no GitLab CI files)

**Container:**
- `Dockerfile` at monorepo root builds and runs the API
- `docker-compose.yml` at monorepo root is for local development infrastructure (Postgres + Redis)

## Payment & Booking Flow

**Payment:**
- No payment gateway integrated (no Stripe, MercadoPago, etc.)
- The homepage UI (`apps/web/app/page.tsx`) mentions "Confirme via Pix" as the intended payment method, but this is UI copy only — no Pix API or webhook endpoint exists in the codebase

**Booking:**
- Handled natively: `POST /tenants/:slug/bookings` creates a `Booking` record with `status: PENDING`
- Confirmation is manual: `PATCH /tenants/:slug/bookings/:id/confirm` (authenticated, ADMIN/ATENDENTE role)

## Notifications

**Email:**
- Not implemented. Customer email is collected (`customerEmail` field in `Booking`) but no email sending service is wired up

**WhatsApp / SMS:**
- Not implemented. Homepage copy mentions "Receba a confirmação por WhatsApp" but no Twilio, Z-API, or equivalent integration exists

## Webhooks & Callbacks

**Incoming:** None configured

**Outgoing:** None configured

## Environment Configuration

**Required env vars — API (`apps/api/.env.example`):**
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Minimum 32-character secret for JWT signing
- `NODE_ENV` — `production` | `development`

**Required env vars — Web (`apps/web/.env.example`):**
- `NEXT_PUBLIC_API_URL` — Base URL of the deployed API (exposed to browser)

**Secrets location:**
- `.env` files in each app directory (`apps/api/.env`, `apps/web/.env.local`)
- Never committed (should be in `.gitignore`)

---

*Integration audit: 2026-04-17*
