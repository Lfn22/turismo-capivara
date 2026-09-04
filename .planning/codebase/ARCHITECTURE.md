<!-- refreshed: 2026-09-04 -->
# Architecture

**Analysis Date:** 2026-09-04

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                      Next.js 16.2 Web Frontend (React 19)               │
├──────────────────────┬───────────────────────┬─────────────────────────┤
│ Public Pages         │ Tenant-Aware Painel   │ Super-Admin Dashboard   │
│ /destinos            │ /:slug/painel/*       │ /super-admin/*          │
│ /roteiros            │ /:slug/admin/*        │                         │
│ /guias               │ (CONDUTOR/ADMIN role) │ (SUPER_ADMIN only)      │
│ `apps/web/app/`      │ `apps/web/app/[slug]` │ `apps/web/app/super-admin`
└──────────┬───────────┴───────────┬───────────┴──────────────┬──────────┘
           │                       │                          │
           ├─ NextAuth Session ────┼─ API Proxy Route ────────┤
           │ (Browser session)     │ /api/proxy?path=...      │
           │                       │ `apps/web/app/api/proxy`│
           │                       │                          │
           ▼                       ▼                          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│              Fastify 5 API Backend (CommonJS, port 3333)                │
├──────────┬───────────┬──────────────┬──────────┬────────────┬──────────┤
│ Auth     │ Bookings  │ Packages     │ Tenants  │ Guides     │Uploads   │
│ Module   │ Module    │ Module       │ Module   │ Module     │  Module  │
│ routes/  │ routes/   │ routes/      │ routes/  │ routes/    │ routes/  │
│ schemas  │ schemas   │ schemas      │ routes/  │ routes/    │ routes/  │
│ emails   │ emails    │ service      │ emails   │ routes/    │ service  │
│          │ expiry    │ (Slot logic) │ tests    │            │ tests    │
│ `apps/   │ `apps/    │ `apps/       │ `apps/   │ `apps/     │ `apps/   │
│ api/src/ │ api/src/  │ api/src/     │ api/src/ │ api/src/   │ api/src/ │
│ modules/ │ modules/  │ modules/     │modules/  │ modules/   │modules/  │
│ auth`    │bookings`  │packages`     │tenants`  │ guides`    │uploads`  │
└─────┬────┴─────┬─────┴──────┬───────┴────┬─────┴────────┬──┴────┬──────┘
      │          │            │            │              │       │
      │  Shared Services & Middleware                     │       │
      │ ┌──────────────────────────────────────────┐     │       │
      │ │ authenticate.ts     (JWT guard)          │     │       │
      │ │ authorize.ts        (Role + tenant check)│     │       │
      │ │ email.ts            (Resend integration) │     │       │
      │ │ payment.service.ts  (Mercado Pago)       │     │       │
      │ │ env.ts              (Config validation)  │     │       │
      │ │ AppError.ts         (Error abstraction)  │     │       │
      │ `apps/api/src/shared`                      │     │       │
      └──────────────────────────────────────────┘     │       │
      │          │            │            │           │       │
      └──────────┴────────────┴────────────┴───────────┴───────┘
                             │
                             ▼
          ┌─────────────────────────────────────────┐
          │   PostgreSQL Database (Prisma 7)        │
          │ ┌─────────────────────────────────────┐ │
          │ │ Models:                             │ │
          │ │ - Tenant (multi-tenant isolation)   │ │
          │ │ - User (ADMIN, ATENDENTE,           │ │
          │ │        CONDUTOR, CLIENTE,SUPER_ADMIN)
          │ │ - GuideProfile (guide extensions)   │ │
          │ │ - TourPackage (with conductorId)    │ │
          │ │ - DepartureSlot (availability)      │ │
          │ │ - Booking (transactional)           │ │
          │ │ - Destination (multi-destination)   │ │
          │ │ - Voucher (post-booking artifacts)  │ │
          │ `apps/api/prisma/schema.prisma`       │ │
          └─────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Auth Module | User login, registration, password reset (tenant-aware) | `apps/api/src/modules/auth/auth.routes.ts` |
| Bookings Module | Create/confirm/cancel bookings, payment webhooks, email notifications | `apps/api/src/modules/bookings/bookings.routes.ts` |
| Packages Module | Package CRUD, slot availability, guide assignment | `apps/api/src/modules/packages/packages.routes.ts` |
| Tenants Module | Tenant registration, approval workflow, tenant management | `apps/api/src/modules/tenants/tenants.routes.ts` |
| Guides Module | Guide profile management, certification data | `apps/api/src/modules/guides/guides.routes.ts` |
| Destinations Module | Destination CRUD, multi-destination catalog | `apps/api/src/modules/destinations/destinations.routes.ts` |
| Uploads Module | Photo upload to R2 (Cloudflare), file management | `apps/api/src/modules/uploads/uploads.routes.ts` |
| Dashboard Module | Analytics and reporting endpoints | `apps/api/src/modules/dashboard/dashboard.routes.ts` |
| Payment Service | Mercado Pago PIX integration, payment status polling | `apps/api/src/services/payment.service.ts` |
| Authenticate Middleware | JWT validation, cross-tenant ownership check | `apps/api/src/shared/middlewares/authenticate.ts` |
| Authorize Middleware | Role-based access control (ADMIN, CONDUTOR, etc.) | `apps/api/src/shared/middlewares/authorize.ts` |

## Pattern Overview

**Overall:** Modular Fastify monorepo with Next.js companion frontend. Tenant-aware routing at all layers.

**Key Characteristics:**
- **Modular routes:** Each domain (auth, bookings, packages, etc.) registers as a Fastify plugin with its own routes, schemas, services
- **Multi-tenant by design:** All requests include `:slug` parameter; tenant ID verified in auth middleware and enforced at database layer
- **API validation:** Zod schemas validate input at route entry; AppError for controlled exceptions
- **Proxy pattern for frontend:** Next.js calls `/api/proxy?path=/tenants/...` to avoid exposing raw JWT to browser
- **Transactional bookings:** `prisma.$transaction` with row-level locking (FOR UPDATE) prevents overbooking
- **Role-based access:** Five roles (SUPER_ADMIN, ADMIN, ATENDENTE, CONDUTOR, CLIENTE); middleware checks role + tenant ownership
- **Async jobs:** Booking expiry job runs via fastify-cron, checks expired bookings periodically
- **Error boundary:** AppError → 4xx response; unexpected errors → 500 + Sentry capture (with tenant/user context)

## Layers

**API Routes Layer:**
- Purpose: HTTP entry points; parse request, call service, return response
- Location: `apps/api/src/modules/*/routes/*.ts`, `apps/api/src/modules/*/*.routes.ts`
- Contains: Zod schemas, route handlers, middleware registration
- Depends on: Fastify, Prisma, services, shared utilities
- Used by: HTTP clients (Next.js frontend, mobile apps, webhooks)

**Service/Business Logic Layer:**
- Purpose: Domain logic (payment creation, slot locking, email sending)
- Location: `apps/api/src/services/*`, within module route files
- Contains: Payment service (Mercado Pago integration), utility functions
- Depends on: Prisma, external SDKs, shared config
- Used by: Routes, jobs, other services

**Data Access Layer (Prisma):**
- Purpose: PostgreSQL access via ORM; ensures schema validation and transactions
- Location: `apps/api/prisma/schema.prisma` (schema definition)
- Contains: Models (Tenant, User, TourPackage, DepartureSlot, Booking, etc.)
- Depends on: PostgreSQL connection (DATABASE_URL)
- Used by: Routes, services, jobs

**Web Frontend Layer:**
- Purpose: React components and Next.js pages for customer and guide interfaces
- Location: `apps/web/app/` (App Router), `apps/web/src/components/`
- Contains: Pages (RSC or client), components (UI, forms, layouts)
- Depends on: Next.js, React, NextAuth, fetch/proxy calls
- Used by: End users (tourists, guides, admins) via browser

**Middleware Layer:**
- Purpose: Cross-cutting concerns (auth, authorization, validation)
- Location: `apps/api/src/shared/middlewares/`, `apps/web/middleware.ts`
- Contains: JWT verification, role checks, tenant ownership validation
- Depends on: Fastify, NextAuth, Prisma (for tenant lookup)
- Used by: Routes (API), pages (web), middleware chain

## Data Flow

### Primary Request Path: Create Booking

1. **User submits booking form** (`apps/web/app/[slug]/(public)/checkout/page.tsx`)
   - Client-side form collects: slotId, name, email, phone, CPF, pax

2. **POST /api/proxy?path=/tenants/{slug}/bookings** (`apps/web/app/api/proxy/route.ts`)
   - Proxy extracts JWT from NextAuth session
   - Forwards to backend with `Authorization: Bearer {jwt}`

3. **POST /tenants/{slug}/bookings** (`apps/api/src/modules/bookings/bookings.routes.ts`)
   - Validate body (Zod schema)
   - Check idempotency key (existing booking)
   - Begin transaction:
     a. Lock slot row (FOR UPDATE) — acquire write lock
     b. Validate: tenant approved, slot available, pax ≤ capacity
     c. Increment slot.booked
   - Call payment service (Mercado Pago)
   - Create Booking record (status: PENDING, paymentUrl, qrCode set)
   - Send confirmation email
   - Return booking data + QR code

4. **Payment status polling** (Client polls or webhook from Mercado Pago)
   - Webhook: `POST /tenants/{slug}/webhooks/mercadopago` → update booking.status
   - On confirmation → send guide notification email, generate voucher

### Secondary Flow: Confirm Booking

1. **GET /tenants/{slug}/bookings/{id}** (frontend checks payment status)
2. **PATCH /tenants/{slug}/bookings/{id}/confirm** (user confirms after payment received)
   - Authenticate user (JWT)
   - Lock slot, verify booked count still valid
   - Update booking.status = CONFIRMED
   - Release lock, return updated booking

### State Management:
- **Request state:** Fastify request object, JWT payload attached by plugin
- **Booking state:** Database-backed (Booking.status: PENDING → CONFIRMED → COMPLETED or CANCELLED)
- **Session state:** NextAuth session in browser + JWT in httpOnly cookie
- **Slot state:** DepartureSlot.booked incremented/decremented atomically via transactions

## Key Abstractions

**Tenant (Multi-Tenancy):**
- Purpose: Isolate data and users by operational entity (tour operator)
- Examples: `apps/api/prisma/schema.prisma` (Tenant model), `apps/api/src/shared/middlewares/authenticate.ts` (tenant ownership check)
- Pattern: Every entity has tenantId FK; routes receive :slug param; middleware resolves slug → tenantId and validates

**Role (Access Control):**
- Purpose: Grant users permissions (SUPER_ADMIN, ADMIN, ATENDENTE, CONDUTOR, CLIENTE)
- Examples: `apps/api/src/shared/middlewares/authorize.ts`, `apps/web/middleware.ts` (painel/ only for CONDUTOR/ADMIN/ATENDENTE)
- Pattern: Store role in User.role; JWT includes role; routes call authorize middleware

**AppError (Controlled Errors):**
- Purpose: Distinguish business errors (4xx) from infrastructure errors (5xx)
- Examples: `apps/api/src/shared/errors/AppError.ts`, thrown in bookings routes (slot not found, overbooking)
- Pattern: Extend Error, include statusCode; caught by setErrorHandler → returns 4xx without Sentry capture

**Zod Schema (Input Validation):**
- Purpose: Runtime validation of request payloads; type-safe error responses
- Examples: `apps/api/src/modules/auth/auth.routes.ts` (loginBodySchema, registerBodySchema), `apps/api/src/modules/bookings/bookings.routes.ts` (createBookingBodySchema)
- Pattern: Define schema inline or in dedicated .schemas.ts file; parse in route; catch ZodError → return 400 with field-level errors

**DepartureSlot with Conductor (Guide Assignment):**
- Purpose: Represent availability for a package with optional guide assignment
- Examples: `apps/api/prisma/schema.prisma` (DepartureSlot, GuideProfile relation)
- Pattern: TourPackage → DepartureSlot (has guideId); GuideProfile linked to User (CONDUTOR role)

## Entry Points

**Backend:**
- Location: `apps/api/src/app.ts`
- Triggers: `pnpm dev` or `pnpm build && pnpm start` in apps/api
- Responsibilities: Initialize Fastify, register plugins (cors, helmet, jwt, rate limit), register all module routes, start HTTP server on port 3333

**Frontend:**
- Location: `apps/web/app/layout.tsx` (root), `apps/web/app/page.tsx` (home)
- Triggers: `pnpm dev` or `pnpm build && pnpm start` in apps/web
- Responsibilities: Render root HTML, apply global styles/fonts, register Providers (NextAuth, etc.), orchestrate App Router page rendering

**Public Home Page:**
- Location: `apps/web/app/page.tsx`
- Shows: Destinations, guides, marketing content

**Tenant-Aware Pages:**
- Location: `apps/web/app/[slug]/...` (dynamic slug for each operator)
- Examples: `apps/web/app/[slug]/(public)/roteiros/page.tsx` (list packages), `apps/web/app/[slug]/(public)/roteiros/[packageId]/page.tsx` (package detail)

**Painel (Guide Dashboard):**
- Location: `apps/web/app/[slug]/(painel)/painel/dashboard/page.tsx`, `painel/roteiros/page.tsx`, `painel/reservas/page.tsx`
- Protected: Only CONDUTOR, ADMIN, ATENDENTE roles (enforced by middleware.ts)

**Super-Admin Pages:**
- Location: `apps/web/app/super-admin/...`
- Protected: Only SUPER_ADMIN role
- Examples: Approve tenants, approve destinations

## Architectural Constraints

- **Threading:** Node.js single-threaded event loop; async I/O via promises; fastify-cron runs jobs serially
- **Global state:** Fastify instance (app) is global singleton; Prisma client (database.default) is singleton
- **Cross-tenant isolation:** Middleware enforces tenantId check; Prisma queries scoped by tenantId; no query can join across tenants
- **Transaction atomicity:** Booking creation uses `prisma.$transaction` with explicit locking (FOR UPDATE); ensures booked count never exceeds capacity
- **JWT lifespan:** 7 days; refresh via NextAuth session renewal (not implemented in current codebase; may be TODO)
- **Rate limiting:** Global 100 reqs/min per IP; tighter limits on auth endpoints (20 reqs/min)
- **Idempotency:** Booking creation checks idempotencyKey header; prevents duplicate charges if request retried
- **Notification async:** Booking confirmation emails sent via Resend in background (no await); may result in occasional unsent emails if process crashes

## Anti-Patterns

### Auth in Route Handler

**What happens:** Some routes manually check JWT and role without using middleware (e.g., manually calling `request.jwtVerify()` in a handler).
**Why it's wrong:** Repeats auth logic, risks forgetting checks, increases surface area for bugs.
**Do this instead:** Register authenticate/authorize middleware in route definition:
```typescript
app.post('/tenants/:slug/bookings/:id/confirm', { preHandler: [authenticate, authorize('CLIENTE')] }, async (request, reply) => {
  // Auth guaranteed here
})
```

### Missing Tenant Filter

**What happens:** A query like `await prisma.booking.findMany()` without `.where({ tenantId: tenant.id })` would return all bookings across all tenants.
**Why it's wrong:** Multi-tenant data leaks; user sees competitors' data.
**Do this instead:** Always include tenant filter:
```typescript
const bookings = await prisma.booking.findMany({
  where: { tenantId: tenant.id }
})
```

### No Transaction for Slot Decrement

**What happens:** Read slot.booked, increment in memory, write back in separate query (two trips to DB).
**Why it's wrong:** Between read and write, another request increments → race condition → overbooking.
**Do this instead:** Use transaction with row-level lock:
```typescript
await prisma.$transaction(async (tx) => {
  const [slot] = await tx.$queryRaw`SELECT ... FROM "DepartureSlot" WHERE id = ${slotId} FOR UPDATE`
  // Now locked — increment safely
  await tx.departureSlot.update({ where: { id: slotId }, data: { booked: slot.booked + pax } })
})
```

## Error Handling

**Strategy:** Distinguish business errors (AppError, 4xx) from infrastructure errors (5xx + Sentry).

**Patterns:**
- **Business error example:** Slot not found → `throw new AppError('SLOT_NOT_FOUND', 404)` → caught by setErrorHandler → returns 404 JSON
- **Validation error example:** Invalid email → ZodError caught in route → return 400 with field-level errors
- **Infrastructure error example:** Database timeout → thrown as regular Error → caught by setErrorHandler → returns 500 + Sentry capture

**Sentry integration:**
- Initialized in `apps/api/src/app.ts` before Fastify instantiation (requirement D-08)
- Fastify error handler captures context (tenant slug, user ID) before sending to Sentry
- AppErrors are NOT sent to Sentry (expected business errors)

## Cross-Cutting Concerns

**Logging:** Fastify built-in logger (pino) with `logger: true` in config; logs all requests; errors logged with context.

**Validation:** Zod schemas at every route entry; errors returned as 400 with field-level details.

**Authentication:** 
- API: JWT in Authorization header, verified by @fastify/jwt plugin, tenant ownership checked in authenticate middleware
- Web: NextAuth with JWT strategy; session cookie (httpOnly, secure); token refresh via NextAuth (if configured)

**Authorization:**
- API: authenticate middleware checks role + tenantId; authorize middleware applies custom role checks
- Web: middleware.ts redirects unauthenticated users to login; blocks non-CONDUTOR from /painel, non-ADMIN from /admin, non-SUPER_ADMIN from /super-admin

**Rate Limiting:** Global 100/min via @fastify/rate-limit; per-endpoint custom limits (auth: 20/min).

---

*Architecture analysis: 2026-09-04*
