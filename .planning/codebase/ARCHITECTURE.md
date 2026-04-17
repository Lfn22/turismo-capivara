# Architecture

**Analysis Date:** 2026-04-17

## Overview

Monorepo managed by Turborepo + pnpm workspaces with two apps:
- `@turismo/api` — Fastify 5 REST API
- `@turismo/web` — Next.js 16 frontend

`packages/` is empty (reserved for shared libs, never used).

## API Architecture

**Pattern:** Flat module-per-domain. No service/repository layer. Business logic lives entirely inside route handlers (`*.routes.ts`).

**Modules:** `auth`, `tenants`, `packages`, `bookings`

**Database:** Prisma 7 with `@prisma/adapter-pg` (native pg driver). Single exported client at `apps/api/src/database.ts`.

**Multi-tenancy:** URL-scoped via `/:slug` path param. Every route resolves the Tenant first. JWT carries `tenantId` but the `authorize` middleware does not cross-check JWT tenant against the URL slug (security gap).

**Booking creation** uses a `prisma.$transaction` to atomically check capacity, increment `slot.booked`, and create the `Booking`.

**Auth:** JWT (`@fastify/jwt`), 1-day expiry, bcrypt password hashing. `authenticate` + `authorize` are Fastify `onRequest` hooks. Token stored in `localStorage` on the frontend.

## Frontend Architecture

**Pattern:** Next.js App Router. Server components fetch with `next: { revalidate: 300 }`. Client components (`"use client"`) manage forms and dashboard via `useEffect` + `fetch`.

No API client abstraction — URLs constructed inline per page. Tenant slug hardcoded as `"serra-viva"` in multiple pages, bypassing the multi-tenant API design.

## Data Flow

```
Browser → Next.js page (Server Component)
  → fetch() to API (hardcoded slug)
    → Fastify route handler
      → authenticate/authorize hooks
        → Prisma → PostgreSQL
```

## Key Architectural Issues

- CORS hardcoded to `http://localhost:3000` — blocks production frontend
- No service layer — all logic in route handlers
- `AppError` class defined but unused
- `@fastify/helmet` installed but never registered
