# Stack — turismo-capivara

> Last mapped: 2026-09-06

## Runtime & Languages

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | >=22.12.0 |
| Language | TypeScript | ^5.9.3 |
| Package Manager | pnpm | monorepo |
| Build Orchestrator | Turborepo | turbo.json |

## API (`apps/api`)

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Fastify | ^5.8.2 |
| ORM | Prisma Client | ^7.5.0 |
| DB Adapter | @prisma/adapter-pg | ^7.5.0 |
| Database Driver | pg | ^8.20.0 |
| Auth | @fastify/jwt | ^10.0.0 |
| Security | @fastify/helmet | ^13.0.2 |
| CORS | @fastify/cors | ^11.2.0 |
| Rate Limiting | @fastify/rate-limit | ^10.3.0 |
| File Upload | @fastify/multipart | ^10.0.0 |
| Validation | Zod | ^4.3.6 |
| Payments | mercadopago | ^2.12.0 |
| Email | resend | ^6.12.3 |
| Object Storage | @aws-sdk/client-s3 | ^3.1064.0 |
| Monitoring | @sentry/node | ^8.55.2 |
| Hashing | bcryptjs | ^3.0.3 |
| Env | dotenv | ^17.3.1 |
| Cron | fastify-cron | ^1.4.0 |
| Raw Body | fastify-raw-body | ^5.0.0 |
| Dev Server | tsx | ^4.21.0 |
| Testing | Vitest | ^4.1.5 |
| Coverage | @vitest/coverage-v8 | ^4.1.5 |

## Web (`apps/web`)

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js | 16.2.1 |
| UI Library | React | 19.2.4 |
| CSS | Tailwind CSS | ^4 |
| Auth | next-auth | 4.24.14 |
| Maps | maplibre-gl | ^5.24.0 |
| Calendar | react-calendar | 6.0.1 |
| QR Code | react-qr-code | ^2.0.21 |
| Toasts | sonner | ^2.0.7 |
| Dialogs | @radix-ui/react-dialog | ^1.1.15 |
| Email | resend | ^6.12.3 |

## Database

- **Engine:** PostgreSQL
- **ORM:** Prisma 7 with `@prisma/adapter-pg` (native pg driver adapter)
- **Schema:** `apps/api/prisma/schema.prisma`
- **IDs:** CUID (`@default(cuid())`) — never UUID
- **Logging:** `['query', 'error', 'warn']`

## Configuration

- **Scripts API:** `dev` (tsx watch), `build` (tsc), `start` (node dist), `seed`, `test`, `test:watch`
- **Scripts Web:** `dev` (next --port 3000), `build`, `start`, `lint`
- **Env validation:** Zod schema in `apps/api/src/shared/env.ts` — `validateEnv()` at startup, `process.exit(1)` on failure
- **Docker:** Dockerfiles present in repo
- **Deployment:** Railway
