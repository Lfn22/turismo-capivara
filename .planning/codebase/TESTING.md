# Testing Patterns

**Analysis Date:** 2026-09-04

## Test Framework

**Runner:**
- Vitest 4.1.5
- Config: `apps/api/vitest.config.ts`
- Environment: Node.js (no DOM simulation)
- Global test utilities enabled: `describe`, `it`, `expect`, `beforeEach`, `afterEach`, `beforeAll`, `afterAll`

**Assertion Library:**
- Vitest built-in `expect()` (compatible with Jest API)

**Run Commands:**
```bash
# Run all tests once (CI mode)
pnpm -F @turismo/api run test

# Watch mode (development)
pnpm -F @turismo/api run test:watch

# Coverage report
pnpm -F @turismo/api run test -- --coverage
```

**Coverage Configuration:**
- Provider: V8
- Reporters: text (console) and lcov (for CI integration)
- Config in `apps/api/vitest.config.ts`:
  ```typescript
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov'],
  }
  ```

## Test File Organization

**Location & Naming:**
- Co-located with source: `{module}.test.ts` or `{module}.spec.ts` in same directory
- Alternatively, grouped in `__tests__/` subdirectory within module
- Pattern observed:
  - `apps/api/src/modules/bookings/emails/booking-created-email.test.ts` (co-located)
  - `apps/api/src/modules/bookings/__tests__/cpf-hash.test.ts` (grouped)
  - `apps/api/src/modules/tenants/__tests__/signup.test.ts` (integration tests)

**File Matching:**
- Vitest config includes: `['src/**/*.test.ts', 'src/**/*.spec.ts']`
- Use `.test.ts` convention (preferred in codebase)

**Test Structure:**
```
src/modules/{module}/
├── {module}.routes.ts
├── {module}.schemas.ts
├── {module}.service.ts
├── {module}.test.ts           (or .spec.ts)
├── __tests__/
│   ├── integration.test.ts
│   └── [other tests]
└── [subfolders like emails/]
    └── email-template.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach, afterAll } from 'vitest'

describe('Feature or Module Name', () => {
  // Setup code (optional)
  
  describe('Sub-feature', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test'
      
      // Act
      const result = processInput(input)
      
      // Assert
      expect(result).toBe('expected')
    })
  })
})
```

**Setup/Teardown Patterns:**
- `beforeEach()`: Clear mocks before each test
  ```typescript
  beforeEach(() => {
    vi.clearAllMocks()
  })
  ```
- `beforeAll()`: Initialize expensive resources (Fastify app)
  ```typescript
  beforeAll(async () => {
    await app.ready()
  })
  ```
- `afterAll()`: Clean up resources
  ```typescript
  afterAll(async () => {
    await app.close()
  })
  ```

**Assertion Patterns:**
- Simple equality: `expect(result).toBe(expectedValue)`
- Deep equality: `expect(result).toEqual({ key: 'value' })`
- Truthiness: `expect(result).toBeTruthy()`, `expect(result).toBeFalsy()`
- Strings: `expect(text).toContain('substring')`, `expect(text).toMatch(/regex/)`
- Numbers: `expect(count).toBeGreaterThan(0)`, `expect(count).toBeCloseTo(expected)`
- Calls: `expect(mockFn).toHaveBeenCalledTimes(1)`, `expect(mockFn).toHaveBeenCalledWith(arg)`
- Type checking in conditionals: `if (!result.success) { expect(result.error.issues[0].message).toContain(...) }`

## Mocking

**Framework:** Vitest's `vi` module

**Module Mocking with Hoisting:**
```typescript
// ✓ Correct: Use vi.hoisted() so mock is available inside vi.mock factory
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    tourPackage: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('../../database', () => ({ default: mockPrisma }))

// Now safe to import the mocked module
import prisma from '../../database'
```

**Function Mocking:**
```typescript
const mockFn = vi.fn()

// Configure return value
mockFn.mockReturnValue('value')

// Configure async return value
mockFn.mockResolvedValue({ id: 'abc' })

// Configure to throw
mockFn.mockRejectedValue(new Error('failed'))
```

**Implementation Mocking (factories):**
```typescript
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ id: 'mock-email-id' }) },
  })),
}))
```

**What to Mock:**
- Database (Prisma): All tests mock to avoid test database dependency
- External APIs: Resend (email), bcryptjs (performance), AWS S3
- DO NOT mock: Core business logic functions, validation functions, error classes

**What NOT to Mock:**
- Validation libraries (Zod) — test with real schemas
- Error classes (AppError) — test real error handling
- Utility functions (hashCpf, isValidCPF) — test to ensure correctness
- Core domain logic — test actual implementation

## Fixtures and Factories

**Test Data:**
- Inline in test cases for simplicity
- Example from `apps/api/src/modules/bookings/emails/booking-created-email.test.ts`:
  ```typescript
  it('includes user name and booking details', () => {
    const result = bookingCreatedEmailText({
      bookingId: 'booking-123',
      customerName: 'João Silva',
      qrCode: 'pix-qr-code-abc',
      paymentUrl: 'https://pagamento.capi.turismo/abc',
      expiresAt: new Date('2025-01-15T12:00:00-03:00'),
      cancelToken: 'abc123token',
      tenantSlug: 'meu-tenant',
    })
    expect(result).toContain('João Silva')
  })
  ```

**Test Helper:**
- `apps/api/src/__tests__/helpers/build-app.ts` provides `buildApp()` function
  ```typescript
  export const TEST_JWT_SECRET = 'test-secret-minimum-32-characters-xx'
  
  export function buildApp(
    ...routePlugins: Array<(app: FastifyInstance) => Promise<void>>
  ): FastifyInstance {
    const app = Fastify({ logger: false })
    app.register(jwt, { secret: TEST_JWT_SECRET })
    for (const plugin of routePlugins) {
      app.register(plugin)
    }
    // Error handler setup...
    return app
  }
  ```
- Used in integration tests: `const app = buildApp(tenantsRoutes)`
- Then inject HTTP requests: `const res = await app.inject({ method: 'POST', url: '/tenants/signup', payload: {...} })`

**Location:**
- Helpers in `apps/api/src/__tests__/helpers/`
- Test fixtures inline or in shared utility modules
- No separate fixtures directory (not yet established)

## Coverage

**Target:** Not explicitly enforced, but tests exist for critical paths

**View Coverage:**
```bash
pnpm -F @turismo/api run test -- --coverage
```

**Current Coverage:**
- Email templates: Good (all notification emails have tests)
- Booking logic: Good (routes, expiry jobs, CPF validation tested)
- Schemas: Good (Zod validation tested with edge cases)
- Auth: Good (signup, login flows tested)
- Routes: Partial (some routes not yet tested, especially error paths)
- Database layer: Mocked (not tested directly)

## Test Types

**Unit Tests:**
- Scope: Individual functions, validation schemas
- Setup: Minimal mocks, inline test data
- Examples:
  - `apps/api/src/modules/packages/packages.routes.test.ts` — Zod schema validation
  - `apps/api/src/modules/bookings/__tests__/cpf-hash.test.ts` — CPF hash function
  - Email templates: Text content validation

**Integration Tests:**
- Scope: Full HTTP request → response cycle including auth, error handling
- Setup: Fastify app via `buildApp()`, mocked database
- Pattern: Use `app.inject()` to simulate HTTP calls without network
- Examples:
  - `apps/api/src/modules/tenants/__tests__/signup.test.ts` — POST /tenants/signup with mocked Prisma
  - `apps/api/src/modules/destinations/destinations.routes.test.ts` — Package routes

**E2E Tests:**
- **Not implemented** — No E2E test framework configured (Cypress, Playwright, etc.)
- API tested via integration tests (Fastify inject)
- Web app not tested (no test runner in `apps/web/`)

## Common Patterns

**Async Testing:**
```typescript
it('should await async operations', async () => {
  const result = await asyncFunction()
  expect(result).toBe(expected)
})

// Mock async returns
mockPrisma.user.findUnique.mockResolvedValue({ id: 'abc' })

// Test async errors
mockPrisma.user.create.mockRejectedValue(new Error('DB error'))
await expect(async () => {
  // code that calls mockPrisma.user.create()
}).rejects.toThrow('DB error')
```

**Error Testing:**
```typescript
it('throws AppError with correct status code', () => {
  expect(() => {
    if (!pkg) throw new AppError('Roteiro não encontrado', 404)
  }).toThrow(AppError)
})

// In integration tests, check HTTP response
const res = await app.inject({
  method: 'PATCH',
  url: '/tenants/slug/bookings/id/cancel',
  payload: { token: 'invalid' },
})
expect(res.statusCode).toBe(404)
expect(res.json().message).toContain('não encontrado')
```

**Zod Schema Validation Testing:**
```typescript
describe('UpdatePackagePhotosInput', () => {
  it('accepts valid photos array', () => {
    const result = UpdatePackagePhotosInput.safeParse({
      photos: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects more than 5 photos', () => {
    const result = UpdatePackagePhotosInput.safeParse({
      photos: Array(6).fill('https://example.com/photo.jpg'),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Máximo 5')
    }
  })
})
```

**Mocking Prisma Errors:**
```typescript
it('handles unique constraint errors', async () => {
  const { Prisma } = await import('@prisma/client')
  const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
    code: 'P2002',
    clientVersion: '7.0.0',
  })
  prismaMock.$transaction.mockRejectedValue(p2002)

  const res = await app.inject({
    method: 'POST',
    url: '/tenants/signup',
    payload: { slug: 'duplicate' },
  })
  expect(res.statusCode).toBe(409)
})
```

**Requirement Traceability:**
- Test names prefixed with requirement ID for traceability
- Examples: `it('NOTIF-01: subject is correct')`, `it('SEC-02: text includes cancel link')`
- Allows correlation between tests and specifications in `.planning/REQUIREMENTS.md`

## Web App Testing

**Status:** Not implemented

**Current State:**
- `apps/web/` has no test framework configured
- No Jest, Vitest, or other test runner in devDependencies
- No test files (*.test.ts, *.spec.ts) found

**When Adding Tests:**
- Recommend: Jest or Vitest for unit tests
- Recommend: React Testing Library for component tests
- Recommend: Playwright or Cypress for E2E tests
- Follow API testing patterns for consistency

## Test Execution in CI

**GitHub Actions (inferred from codebase):**
- Run tests: `pnpm -F @turismo/api run test`
- Generate coverage: `pnpm -F @turismo/api run test -- --coverage`
- Coverage reports: lcov format for upload to coverage services

**Local Development:**
- Watch mode: `pnpm -F @turismo/api run test:watch`
- Single run: `pnpm -F @turismo/api run test`

---

*Testing analysis: 2026-09-04*
