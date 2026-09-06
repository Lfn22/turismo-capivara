# Concerns — turismo-capivara

> Last mapped: 2026-09-06

## Security — HIGH

### Input Validation Gaps
- Zod schemas exist for bookings, packages, destinations — but **not all routes validate payload in runtime**
- Some routes may accept unvalidated input directly from `request.body`
- Phase 1 (Security Hardening) targets this

### CORS Configuration
- `CORS_ORIGIN` defaults to `'http://localhost:3000'` when env var is missing
- Required in production via `validateEnv()`, but fallback exists in `app.ts` registration
- Single origin only — no multi-origin support

### Booking Endpoints Auth
- Some booking PATCH endpoints (cancel/confirm) may lack JWT auth middleware
- Phase 1 critical fix item

### CPF Storage — LGPD
- CPF hashed with HMAC-SHA256 (good) — never stored in plaintext
- `CPF_SECRET` and `ANONYMIZATION_SALT` required env vars
- No data retention/deletion automation yet

## Architecture — MEDIUM

### No Service Layer Consistency
- Most business logic lives in route handlers (fat controllers)
- Only `payment.service.ts`, `packages.service.ts`, `destinations.service.ts`, `uploads.service.ts` have service extraction
- Makes unit testing harder — tests must go through HTTP layer

### No Shared Packages
- Monorepo has no `packages/` directory for shared types/utilities
- Web and API duplicate type definitions
- No shared validation schemas between frontend and backend

### Web API Proxy Layer
- `apps/web/app/api/` contains many proxy routes to the Fastify API
- Adds latency and maintenance overhead
- Could be simplified with direct client-to-API calls + CORS

## Testing — MEDIUM

### No Frontend Tests
- Zero test coverage for Next.js app
- No component testing, no E2E testing

### Mock-Only Backend Tests
- All API tests mock Prisma — no real database integration tests
- Risk: mock/prod divergence (queries succeed in mocks but fail against real DB)
- No migration testing

### No CI Pipeline
- No GitHub Actions or CI config detected at project root
- Tests run locally only
- No automated quality gates

## Code Quality — LOW

### No Linting Config
- No ESLint/Prettier config at root level
- Only `eslint-config-next` in web app
- No enforced code style across monorepo

### TODO/FIXME Items
- Scattered TODO comments in codebase (limited count found)

## Performance — LOW

### Prisma Query Logging
- `log: ['query', 'error', 'warn']` in production database client
- Query logging in prod impacts performance — should be conditional on `NODE_ENV`

### No Caching
- No Redis or in-memory cache
- All requests hit database directly
- Destination/package listings could benefit from caching

## Deployment — LOW

### Railway Single-Region
- Deployed to Railway (single region assumed)
- No CDN for static assets mentioned
- No health check endpoint documented (may exist)

### No Seed/Migration CI
- `prisma db push` or manual migrations assumed
- No automated migration pipeline
