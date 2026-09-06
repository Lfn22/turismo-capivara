# Testing — turismo-capivara

> Last mapped: 2026-09-06

## Framework

- **Vitest** ^4.1.5 with `globals: true`, `environment: 'node'`
- **Coverage:** `@vitest/coverage-v8` with `text` + `lcov` reporters
- **Config:** `apps/api/vitest.config.ts`
- **Scripts:** `pnpm test` (run), `pnpm test:watch` (watch mode)

## Test Structure

### Integration Tests (`apps/api/src/__tests__/`)
End-to-end HTTP tests using `app.inject()`:

| File | Domain |
|------|--------|
| `bookings-b1.test.ts` | Booking business logic |
| `bookings-create.test.ts` | Booking creation |
| `cancel-self.test.ts` | Self-service cancellation |
| `checkout.test.ts` | Checkout flow |
| `booking-price.test.ts` | Price calculations |
| `dashboard.test.ts` | Dashboard endpoints |
| `self-service.test.ts` | Self-service flows |
| `rate-limit.test.ts` | Rate limiting |
| `sentry.test.ts` | Error monitoring |
| `tenants.test.ts` | Tenant operations |

### Co-located Tests
- `apps/api/src/modules/bookings/__tests__/cpf-hash.test.ts`
- `apps/api/src/modules/tenants/__tests__/approval.test.ts`
- `apps/api/src/modules/tenants/__tests__/signup.test.ts`
- `apps/api/src/modules/destinations/destinations.routes.test.ts`
- `apps/api/src/modules/packages/packages.routes.test.ts`
- `apps/api/src/modules/uploads/uploads.routes.test.ts`
- `apps/api/src/modules/uploads/uploads.service.test.ts`

### Email Template Tests
- `booking-confirmed-email.test.ts`
- `booking-created-email.test.ts`
- `booking-expired-email.test.ts`
- `guide-approved-email.test.ts`
- `expiry.job.test.ts`

## Test Helper

`apps/api/src/__tests__/helpers/build-app.ts`

Builds a minimal Fastify instance with JWT + error handler + specified route plugins. Used by all integration tests.

```typescript
const app = await buildApp(bookingsRoutes, tenantsRoutes)
const response = await app.inject({ method: 'POST', url: '/...', payload: {...} })
```

## Mocking

- `vi.mock('../database')` — Prisma client mock
- `vi.mock('../services/payment.service')` — Payment service mock
- No test database — all tests mock Prisma
- Tests assert against `response.statusCode` and `response.json()`

## Coverage

- Provider: v8
- No minimum coverage thresholds configured
- No CI pipeline enforcing coverage gates

## Frontend Testing

- **None configured** — no test framework in `apps/web`
