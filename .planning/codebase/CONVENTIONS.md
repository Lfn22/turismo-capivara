# Coding Conventions

**Analysis Date:** 2026-09-04

## Naming Patterns

**Files:**
- Route files: `{module}.routes.ts` (e.g., `apps/api/src/modules/auth/auth.routes.ts`)
- Schema files: `{module}.schemas.ts` (e.g., `apps/api/src/modules/bookings/bookings.schemas.ts`)
- Service files: `{module}.service.ts` (e.g., `apps/api/src/modules/packages/packages.service.ts`)
- Test files: `{name}.test.ts` or `{name}.spec.ts` (co-located with source)
- Component files: PascalCase (e.g., `PublicNav.tsx`, `BookingForm.tsx`)
- API route files in Next.js: `route.ts` in bracket directories (e.g., `app/api/auth/[...nextauth]/route.ts`)

**Functions:**
- Verb-first pattern: `updatePackagePhotos`, `createBooking`, `hashCpf`
- Async functions for I/O operations
- Exported functions are async and directly usable as Fastify route handlers in API
- Handler functions defined inline in routes: `async (request, reply) => { ... }`

**Variables:**
- camelCase throughout: `customerName`, `tenantSlug`, `packageId`
- Constants in UPPER_SNAKE_CASE for test fixtures: `TEST_JWT_SECRET`
- No prefix conventions (avoid `$`, `_` prefixes)

**Types/Interfaces:**
- PascalCase: `PublicNavProps`, `FormState`, `SelfServiceBody`
- Props interfaces suffixed with `Props` in React components
- Schema types derived from Zod with `z.infer<typeof schema>` pattern
- Type aliases exported alongside schemas: `export type SelfServiceBody = z.infer<typeof selfServiceBodySchema>`

**Schemas & Validation:**
- Zod schema objects suffixed with `Schema`: `loginBodySchema`, `createBookingBodySchema`
- Params schemas: `slugParamsSchema`, `slugAndIdParamsSchema`
- Portuguese error messages in Zod validations (required by Phase 1)
- Custom validation functions (e.g., `isValidCPF`) defined in the same file or utility folder

## Code Style

**Formatting:**
- No Prettier config enforced — formatting is implicit via TypeScript strict mode
- 2-space indentation (inferred from codebase)
- Imports use consistent quoting: single quotes in Node code, double quotes in React/JSX
- Line length not enforced; natural breaks at logical boundaries

**Linting:**
- **API** (`apps/api/`): No explicit ESLint config; TypeScript strict mode enforced
- **Web** (`apps/web/`): ESLint 9 with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
  - Config file: `apps/web/eslint.config.mjs` (ESLint v9 flat config)
  - Run with: `pnpm run lint` in web app

**Language & Module System:**
- **API**: CommonJS (Node.js, `module: "commonjs"` in `apps/api/tsconfig.json`)
- **Web**: ESM (Next.js, `module: "esnext"`)
- TypeScript strict mode in both apps

## Import Organization

**Order (API — Fastify/Node.js):**
1. Node.js built-ins: `import { createHmac } from 'crypto'`
2. External packages: `import Fastify from 'fastify'`, `import { z } from 'zod'`
3. Relative imports from `src/`: `import prisma from '../../database'`, `import { AppError } from '../../shared/errors/AppError'`
4. Local module imports: `import { bookingCreatedEmailText } from './emails/booking-created-email'`

**Order (Web — Next.js/React):**
1. External packages: `import Link from 'next/link'`, `import { useState } from 'react'`
2. Relative imports: `import { PublicNav } from '@/components/layout/PublicNav'`
3. Local component imports

**Path Aliases:**
- **Web only**: `@/*` resolves to `apps/web/` root (configured in `apps/web/tsconfig.json`)
- Example: `import SomeComponent from '@/components/ui/Button'`
- API does not use path aliases (uses relative paths)

## Error Handling

**Pattern:**
- Custom `AppError` class in `apps/api/src/shared/errors/AppError.ts` with `message` and `statusCode` properties
- Throw `AppError` with Portuguese message and HTTP status code: `throw new AppError('Roteiro não encontrado', 404)`
- In Fastify error handler, check `instanceof AppError` to distinguish business errors from unexpected errors
- Unexpected errors logged and sent to Sentry; business errors returned directly to client

**Zod Validation in Routes:**
- Parse with try-catch: `try { body = schema.parse(request.body) } catch (err) { if (err instanceof ZodError) { return reply.status(400).send(zodError400(err)) } }`
- Helper function `zodError400(err)` formats errors with field path and message
- All validation error messages in Portuguese

**Authorization:**
- Service functions accept `userId`, `role` parameters and throw `AppError` if unauthorized
- Example in `apps/api/src/modules/packages/packages.service.ts`:
  ```typescript
  if (userRole !== 'ADMIN' && pkg.conductorId !== userId) {
    throw new AppError('Não autorizado', 403)
  }
  ```
- Route handlers extract user from JWT and pass to service

## Logging

**Framework:**
- Fastify built-in logger: `app.log.error(err)`, `app.log.info(message)`
- Sentry integration for error tracking: `Sentry.captureException(err)`

**Patterns:**
- Log to Sentry with scope tags for tenant and user context (see `apps/api/src/app.ts` error handler)
- Development: JSON logs from Fastify (configured with `logger: true`)
- Health check includes database probe with logging

## Comments

**When to Comment:**
- Implementation notes marked with `// NOTE:` (e.g., explaining why CommonJS is used, rationale for design decision)
- Known issues/work items marked with `// TODO:` followed by requirement ID (e.g., `// TODO WR-002: endsWith generates LIKE '%suffix' without index`)
- Block comments before complex sections (test setup, mock factories)

**JSDoc/TSDoc:**
- Used for test helper functions with explanation of purpose and behavior
- Example in `apps/api/src/__tests__/helpers/build-app.ts`:
  ```typescript
  /**
   * Builds a minimal Fastify app for integration tests.
   * Registers JWT plugin + provided route plugins + error handler.
   * Does NOT start a real HTTP server — use app.inject() for requests.
   */
  ```
- Not required for every function; use for public APIs and helpers

## Function Design

**Size & Complexity:**
- Route handlers typically 40-100 lines (validation + logic + response)
- Service functions 10-30 lines (domain logic only, no HTTP handling)
- Complex operations broken into steps with intermediate variables

**Parameters:**
- Route handlers receive `FastifyRequest` and `FastifyReply`
- Service functions take primitive parameters: `(packageId: string, userId: string, photos: string[])`
- Additional context as needed: `userRole?: string`

**Return Values:**
- Route handlers return HTTP responses via `reply.status(code).send(data)`
- Service functions return Prisma query results or throw `AppError`
- Functions using Prisma `select` to minimize data exposure (security pattern)

**Async/Await:**
- All I/O operations are async
- No `.then()` chains; use `await` keyword
- Error propagation via `throw` (caught by Fastify error handler)

## Module Design

**Barrel Exports:**
- Each module exports a single async function registered as Fastify plugin
- Example: `export async function bookingsRoutes(app: FastifyInstance) { app.post(...) }`
- Imported and registered in `apps/api/src/app.ts`: `app.register(bookingsRoutes)`

**Module Structure:**
- `apps/api/src/modules/{module}/` contains:
  - `{module}.routes.ts` — HTTP routes, Zod schemas, inline validation
  - `{module}.schemas.ts` — Zod schemas extracted for reuse
  - `{module}.service.ts` — Business logic, Prisma queries, authorization
  - `__tests__/` — Integration and unit tests
  - `emails/` — Email template functions (if applicable)
  - `*.job.ts` — Cron jobs (e.g., `expiry.job.ts`)

**Shared Utilities:**
- `apps/api/src/shared/` contains:
  - `errors/` — `AppError` class
  - `middlewares/` — `authenticate()`, `authorize()` functions
  - `utils/` — `hashCpf()`, validation helpers
  - `config/` — External service config (e.g., R2, Sentry)
  - `types/` — Global type definitions
  - `env.ts` — Environment validation with Zod
  - `email.ts` — Email service configuration
  - `sentry.ts` — Sentry initialization

**Web App Structure:**
- `apps/web/app/` — Next.js app router pages and API routes
- `apps/web/src/components/` — React components organized by feature
- `apps/web/src/styles/` — Global CSS/TailwindCSS
- Middleware authentication in `apps/web/middleware.ts`

## React/Next.js Conventions (Web)

**Components:**
- Exported as named exports (default in some cases, but prefer named)
- Use "use client" directive for interactive components
- Props typed with interfaces: `interface PublicNavProps { ... }`

**State Management:**
- `useState` hook for local component state
- Form state typed as interface (e.g., `FormState` with fields: `guestName`, `email`, `cpf`, `pax`)
- Event handlers: `handleChange`, `handleSubmit` (verb-first)

**Styling:**
- TailwindCSS v4 for utility classes
- CSS variables for theming: `var(--stone-900)`, `var(--ochre)`
- Inline styles for dynamic values or CSS variable references
- No CSS modules; Tailwind-first approach

**API Routes:**
- Next.js route handlers in `app/api/` with request type `NextRequest`
- Return `NextResponse` with status and headers
- Proxy pattern to backend API common (see `apps/web/app/api/proxy/route.ts`)

## Environment Configuration

**Variables (API):**
- Validated at startup with Zod schema in `apps/api/src/shared/env.ts`
- Required vars: `DATABASE_URL`, `JWT_SECRET`, `MP_ACCESS_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `RESEND_API_KEY`, `CPF_SECRET`, `ANONYMIZATION_SALT`
- Optional with defaults: `CORS_ORIGIN` (required in production), `WEB_URL`, `BOOKING_EXPIRY_MINUTES` (default 30)
- NODE_ENV: development | production | test

**Variables (Web):**
- Accessible via `process.env` in server code (pages, API routes, middleware)
- Public vars prefixed with `NEXT_PUBLIC_` (e.g., `NEXT_PUBLIC_API_URL`)
- Checked in `.env.example` for documentation

## Database

**ORM:** Prisma 7.5.0

**Patterns:**
- Queries use `select` to minimize data (security): `prisma.user.findFirst({ where: {...}, select: {id, name, role} })`
- Transactions for booking operations (anti-overbooking): `prisma.$transaction([...])`
- Multi-tenant via `tenantId` foreign key on all user-owned entities
- Date fields handled with Prisma DateTime: expiry, createdAt, updatedAt

---

*Convention analysis: 2026-09-04*
