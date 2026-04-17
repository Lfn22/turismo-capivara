# Code Conventions

**Analysis Date:** 2026-04-17

## Language & Toolchain

Both apps use TypeScript with `"strict": true`. No shared Prettier or ESLint config at the monorepo root.

- **API (`apps/api`):** TypeScript 5, compiled with `tsc` to CommonJS, target ES2022. No linter configured.
- **Web (`apps/web`):** TypeScript 5, Next.js bundler resolution, `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` via `apps/web/eslint.config.mjs`. No Prettier config.

## Naming Patterns

- **API route files:** `[domain].routes.ts` — `auth.routes.ts`, `bookings.routes.ts`, etc.
- **Shared utilities:** PascalCase for class files (`AppError.ts`), camelCase for function files (`authenticate.ts`)
- **Web pages:** Always `page.tsx` inside a named directory (Next.js App Router)
- **API modules:** `src/modules/[domain]/` — lowercase plural domain names
- **Route directories (web):** Portuguese kebab-case — `roteiros/detalhe/`, `dashboard/reservas/`
- **Route handler functions:** `async function [domain]Routes(app: FastifyInstance)` — camelCase with `Routes` suffix
- **Event handlers:** `handle[Action]` pattern — `handleSubmit`, `handleConfirm`, `handleCancel`
- **React state:** Portuguese names — `erro` (not `error`), `sucesso`, `loading`
- **Constants/lookup maps:** SCREAMING_SNAKE_CASE — `STATUS`, `DIFFICULTY`
- **Interfaces:** PascalCase, no `I` prefix — `Booking`, `Roteiro`, `DepartureSlot`

## Import Style

- API: single quotes; Web: double quotes — **inconsistency between apps**
- No barrel `index.ts` files — each module imported directly by path
- `@/*` alias available in web (maps to `./`) but not currently used

## Styling

- Primary approach: inline `style` objects throughout nearly all pages
- `apps/web/app/roteiros/[slug]/page.tsx` is an outlier using Tailwind CSS `className` — indicates a migration in progress
- Reusable style objects extracted as `const` below the component when reused
- CSS custom properties used extensively: `var(--stone-900)`, `var(--ochre)`, `var(--font-display)`

## Error Handling

- API routes return `reply.status(xxx).send({ message: '...' })` directly
- `AppError` class exists at `apps/api/src/shared/errors/AppError.ts` but is **not thrown** in current route handlers
- Transaction errors: plain `new Error('SLOT_NOT_FOUND')` string codes thrown inside `prisma.$transaction`, caught and mapped to HTTP responses
- Web client components: `useState<string | null>(null)` for `erro`, displayed inline, reset in `finally` blocks
- Web server components: return `null` or `[]` on fetch errors with a `console.error(...)` call before the fallback

## Logging

- API: Fastify built-in logger (`logger: true`), Prisma `log: ['query', 'error', 'warn']`
- Web: `console.error(...)` only — no structured logging or error reporting service

## Module Design

- No service layer — all business logic lives inside route handler functions
- Prisma client is a singleton at `apps/api/src/database.ts`, imported everywhere as `prisma`
- Web pages are self-contained — data-fetching functions, type definitions, and constants all colocated in each `page.tsx`
- Types are redefined per page (e.g., `Roteiro` interface appears in multiple files with slight variations)
