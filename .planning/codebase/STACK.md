# Technology Stack

**Analysis Date:** 2026-04-17

## Languages

**Primary:**
- TypeScript 5.x - Used across both apps (`apps/api` and `apps/web`)

**Secondary:**
- SQL - Prisma migrations in `apps/api/prisma/migrations/`

## Runtime

**Environment:**
- Node.js 22.12.0 (pinned in `Dockerfile`: `node:22.12.0-alpine`)

**Package Manager:**
- pnpm 10.32.1 (declared in root `package.json` `packageManager` field)
- Lockfile: `pnpm-lock.yaml` present at root
- Workspace: `pnpm-workspace.yaml` covers `apps/*` and `packages/*`

## Monorepo

**Orchestrator:**
- Turborepo ^2.8.19 - declared in root `package.json` devDependencies
- Config: `turbo.json` — defines `build` (with outputs `dist/**`, `.next/**`) and `dev` (persistent, no cache) tasks
- Build order: `^build` dependency ensures `api` is built before dependents

## Frameworks

**API (`apps/api`):**
- Fastify ^5.8.2 - HTTP server and router (`src/app.ts`)
- @fastify/cors ^11.2.0 - CORS plugin, configured for `http://localhost:3000`
- @fastify/helmet ^13.0.2 - Security headers plugin (imported in package, not yet registered in `src/app.ts`)
- @fastify/jwt ^10.0.0 - JWT plugin, secret via `JWT_SECRET` env var

**Web (`apps/web`):**
- Next.js 16.2.1 - React framework, App Router architecture
- React 19.2.4
- React DOM 19.2.4

**CSS (`apps/web`):**
- Tailwind CSS ^4 - via `@tailwindcss/postcss ^4` PostCSS plugin
- PostCSS config: `apps/web/postcss.config.mjs`

## ORM / Database Client

**API (`apps/api`):**
- Prisma ^7.5.0 - Schema at `apps/api/prisma/schema.prisma`, migrations at `apps/api/prisma/migrations/`
- @prisma/client ^7.5.0 - Generated client
- @prisma/adapter-pg ^7.5.0 - Native PostgreSQL driver adapter (`PrismaPg` used in `src/database.ts`)
- pg ^8.20.0 - PostgreSQL driver used by the Prisma adapter
- Prisma config file: `apps/api/prisma.config.ts`

## Auth / Security

**API:**
- @fastify/jwt ^10.0.0 - Issues and verifies JWTs (1-day expiry, `sub`/`tenantId`/`role`/`name` claims)
- bcryptjs ^3.0.3 - Password hashing and comparison (`compareSync` used in `src/modules/auth/auth.routes.ts`)

## Key Dependencies

**Critical (API):**
- `dotenv ^17.3.1` - Loads `.env` at startup (`import 'dotenv/config'` in `src/app.ts` and `src/database.ts`)

**Dev Tools (API):**
- `tsx ^4.21.0` - TypeScript execution for dev (`tsx watch src/app.ts`) and seed scripts
- `typescript ^5.9.3` - TypeScript compiler; tsconfig targets ES2022, outputs to `dist/`
- `@types/node ^25.5.0`

**Dev Tools (Web):**
- `eslint ^9` - Linting
- `eslint-config-next 16.2.1` - Next.js ESLint rules (core-web-vitals + TypeScript); config at `apps/web/eslint.config.mjs`
- `typescript ^5` - tsconfig targets ES2017, `noEmit: true` (Next.js handles compilation)
- `@types/react ^19`, `@types/react-dom ^19`, `@types/node ^20`

## Build Configuration

**API:**
- `tsc` compiles `src/` → `dist/` (CommonJS modules, ES2022 target)
- Dev: `tsx watch src/app.ts` (hot reload)
- Prod start: `node dist/app.js` (after `prisma migrate deploy`)

**Web:**
- `next build` / `next dev --port 3000`
- TypeScript path alias: `@/*` maps to `./` (web root)

## Container

**Dockerfile** (root of monorepo):
- Base image: `node:22.12.0-alpine`
- Installs pnpm globally via npm, runs `pnpm install --frozen-lockfile`
- Builds only the API: `pnpm --filter @turismo/api build`
- Exposes port `3333`
- Entrypoint: `npx prisma migrate deploy && node dist/app.js`

**docker-compose.yml** (root, dev only):
- PostgreSQL 16 — container `turismo_postgres`, port `5432`, db `turismo_dev`
- Redis 7-alpine — container `turismo_redis`, port `6379`
- Note: Redis is defined in compose but **no Redis client dependency** appears in any `package.json`; it is not actively used in application code

## Platform Requirements

**Development:**
- Node.js 22.x
- pnpm 10.32.1
- Docker (for local PostgreSQL via compose)
- `DATABASE_URL` env var pointing to PostgreSQL instance
- `JWT_SECRET` env var (min 32 chars recommended)

**Production:**
- Deployed to Railway (API URL pattern `https://sua-api.railway.app` in `.env.example`)
- API listens on `0.0.0.0:3333`
- Web frontend: `NEXT_PUBLIC_API_URL` env var required at build/runtime

---

*Stack analysis: 2026-04-17*
