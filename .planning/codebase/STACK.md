# Technology Stack

**Analysis Date:** 2026-09-04

## Languages

**Primary:**
- TypeScript 5.9.3 (API: strict mode, ES2022 target)
- TypeScript 5.x (Web: ES2017 target, Next.js preset)
- JavaScript (CommonJS in API, ESM in Web)

**Secondary:**
- Shell/Bash (Dockerfile, build scripts)
- SQL (PostgreSQL via Prisma migrations)

## Runtime

**Environment:**
- Node.js 22.12.0+ (required in root `package.json` and app-specific `package.json` files)
- Environment: development/production/test (via NODE_ENV)

**Package Manager:**
- pnpm 10.32.1 (monorepo package manager)
- Lockfile: `pnpm-lock.yaml` (presence confirmed)

## Frameworks

**Core:**
- Fastify 5.8.2 - High-performance HTTP server for API (`apps/api/src/app.ts`)
- Next.js 16.2.1 - React meta-framework with App Router for web (`apps/web/`)
- React 19.2.4 - UI component library

**Monorepo & Build:**
- Turborepo 2.8.19 - Build orchestration and task caching (`turbo.json`)
- TypeScript 5.9.3 (API), 5.x (Web) - Strict type checking

**ORM & Database:**
- Prisma 7.5.0 - Database abstraction layer
- @prisma/adapter-pg 7.5.0 - PostgreSQL adapter
- pg 8.20.0 - Native PostgreSQL client

**Testing:**
- Vitest 4.1.5 - Unit/integration test framework (API)
- @vitest/coverage-v8 4.1.5 - Code coverage reports
- Run: `npm run test` (vitest run), `npm run test:watch`

**Dev/Build Tools:**
- tsx 4.21.0 - TypeScript execution for Node.js scripts
- TSC (tsc) - TypeScript compiler
- ESLint 9.x (Web) - Code linting
- Tailwind CSS 4.x (Web) - Utility-first CSS framework
- Tailwind PostCSS 4.x (Web) - CSS processing

## Key Dependencies

**Critical:**
- Zod 4.3.6 - Runtime schema validation (all routes — Phase 1 mandatory)
- Prisma Client 7.5.0 - Data access layer
- bcryptjs 3.0.3 - Password hashing

**API Infrastructure:**
- @fastify/cors 11.2.0 - CORS middleware
- @fastify/helmet 13.0.2 - Security headers (CSP, HSTS, etc.)
- @fastify/jwt 10.0.0 - JWT authentication
- @fastify/rate-limit 10.3.0 - Rate limiting (100 req/min global)
- @fastify/multipart 10.0.0 - Multipart form handling
- fastify-cron 1.4.0 - Cron job scheduling (booking expiry)
- fastify-raw-body 5.0.0 - Raw request body access (webhooks)

**Payment & Billing:**
- mercadopago 2.12.0 - PIX payment processing

**File Storage:**
- @aws-sdk/client-s3 3.1064.0 - S3-compatible API (Cloudflare R2)

**Email:**
- resend 6.12.3 - Email delivery service

**Error Tracking:**
- @sentry/node 8.55.2 - Error monitoring (optional, graceful no-op if no DSN)

**Authentication (Web):**
- next-auth 4.24.14 - Session management for Next.js

**Frontend Components:**
- @radix-ui/react-dialog 1.1.15 - Dialog/modal primitives
- react-calendar 6.0.1 - Calendar component
- maplibre-gl 5.24.0 - Vector map rendering
- react-qr-code 2.0.21 - QR code generation
- sonner 2.0.7 - Toast notifications

**Utilities:**
- dotenv 17.3.1 - Environment variable loading

## Configuration

**Environment Variables (Runtime):**

**Database:**
- `DATABASE_URL` (required) - PostgreSQL connection string
- `NODE_ENV` (default: development) - Execution environment

**Authentication:**
- `JWT_SECRET` (required, min 32 chars) - HMAC key for Fastify JWT
- `NEXTAUTH_SECRET` (required for web) - NextAuth session signing
- `NEXTAUTH_URL` (web) - Next.js origin for NextAuth

**Server & Deployment:**
- `PORT` (default: 3333 in API) - Server port
- `CORS_ORIGIN` (required in production) - Allowed frontend origin
- `APP_URL` - API base URL for clients
- `WEB_URL` - Frontend URL for API redirects
- `NODE_ENV` - Execution environment (development/production)

**API Endpoints:**
- `API_URL` (server-side in web) - Backend API
- `NEXT_PUBLIC_API_URL` (browser-side in web) - Backend API

**Security & Data:**
- `CPF_SECRET` (required, min 32 chars) - HMAC key for CPF encryption
- `ANONYMIZATION_SALT` (required, min 32 chars) - Salt for data anonymization

**Integrations:**
- `MP_ACCESS_TOKEN` (required) - Mercado Pago access token
- `MP_WEBHOOK_SECRET` (required) - HMAC key for webhook signature validation
- `CLOUDFLARE_ACCOUNT_ID` (required) - Cloudflare account ID for R2
- `CLOUDFLARE_API_TOKEN` (required) - Cloudflare R2 credentials (format: `accessKeyId:secretAccessKey`)
- `R2_BUCKET_NAME` (required) - Cloudflare R2 bucket name
- `R2_PUBLIC_URL` (required) - Cloudflare R2 public URL (e.g., `https://pub-xxxx.r2.dev`)
- `RESEND_API_KEY` (optional) - Resend email service API key
- `EMAIL_FROM` (optional, default: `CAPI <noreply@capi.turismo>`) - Sender email address

**Monitoring:**
- `SENTRY_DSN` (optional) - Sentry error tracking DSN; app runs without it

**Business Logic:**
- `BOOKING_EXPIRY_MINUTES` (default: 30) - Minutes before a pending booking expires

**Build Artifacts:**
- TypeScript output: `apps/api/dist/` (CommonJS)
- Next.js output: `apps/web/.next/`
- Prisma client: Generated in `node_modules/@prisma/client`

**Config Files:**
- `apps/api/tsconfig.json` - API TypeScript configuration (strict mode, CommonJS)
- `apps/web/tsconfig.json` - Web TypeScript configuration (ESM, Next.js plugin)
- `apps/web/next.config.ts` - Next.js configuration (image remotes, transpilation)
- `apps/web/eslint.config.mjs` - ESLint configuration (Next.js core web vitals + TS)
- `turbo.json` - Turborepo task definitions
- `apps/api/prisma/schema.prisma` - Database schema and migrations
- `apps/api/prisma/migrations/` - Schema migration history
- `.env` files (git-ignored, see `.env.example` templates)

## Platform Requirements

**Development:**
- Node.js 22.12.0+
- pnpm 10.32.1
- PostgreSQL 12+ (local or remote)
- TypeScript knowledge (strict mode enforced)

**Production:**
- Node.js 22.12.0+ runtime
- PostgreSQL 12+ database
- Cloudflare R2 bucket (or S3-compatible storage)
- Mercado Pago merchant account (with API credentials)
- Resend account for email delivery (optional)
- Sentry account for error tracking (optional)
- Railway deployment platform (or any Node.js host)

**Build:**
- Dockerfile-based builds (railway.json specifies `DOCKERFILE` builder)
- Release command: `npx prisma migrate deploy` (runs on Railway deploy)
- Health check: `GET /health` (API), `GET /` (web)
- Start command (API): `node dist/app.js`

---

*Stack analysis: 2026-09-04*
