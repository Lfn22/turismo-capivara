---
phase: 08-operator-onboarding
reviewed: 2026-05-19T23:45:00-03:00
depth: standard
files_reviewed: 21
files_reviewed_list:
  - apps/api/src/shared/utils/hash.ts
  - apps/api/src/modules/bookings/__tests__/cpf-hash.test.ts
  - apps/api/src/modules/tenants/__tests__/signup.test.ts
  - apps/api/src/modules/tenants/__tests__/approval.test.ts
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/seed.ts
  - apps/api/src/modules/auth/auth.routes.ts
  - apps/api/src/modules/bookings/bookings.routes.ts
  - apps/api/src/modules/guides/guides.routes.ts
  - apps/api/src/modules/tenants/emails/approval-email.ts
  - apps/api/src/modules/tenants/emails/rejection-email.ts
  - apps/api/src/modules/tenants/tenants.routes.ts
  - apps/web/app/onboarding/page.tsx
  - apps/web/app/onboarding/aguardando/page.tsx
  - apps/web/app/super-admin/layout.tsx
  - apps/web/app/super-admin/operadoras/page.tsx
  - apps/web/app/api/super-admin/tenants/pending/route.ts
  - apps/web/app/api/super-admin/tenants/[id]/approve/route.ts
  - apps/web/app/api/super-admin/tenants/[id]/reject/route.ts
  - apps/web/middleware.ts
  - apps/web/app/login/page.tsx
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-05-19T23:45:00-03:00
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Phase 08 implements operator self-service onboarding: a public `/tenants/signup` endpoint, a SUPER_ADMIN approval/rejection flow with email notifications, CPF hashing via HMAC-SHA256, and the matching Next.js UI (onboarding form, waiting page, super-admin dashboard, BFF API routes, middleware).

The implementation is solid overall. No critical issues found. The four warnings are genuine logic/correctness gaps: the seed file falls back to a predictable dev secret when `CPF_SECRET` is absent (weakening HMAC integrity), the `GET /tenants` route leaks internal fields to any tenant-scoped ADMIN, the middleware `/painel` guard is brittle in ordering, and the approval test does not cover the idempotency 409 branch.

---

## Warnings

### WR-01: Seed `hashCpf` falls back to hardcoded secret when `CPF_SECRET` is unset

**File:** `apps/api/prisma/seed.ts:8`
**Issue:** The seed's local `hashCpf` uses `process.env.CPF_SECRET ?? 'dev-seed-secret'` as the fallback, while the production utility (`hash.ts`) throws if the variable is missing. A developer who forgets to set `CPF_SECRET` seeds the DB with hashes derived from `'dev-seed-secret'`. If the real app then starts with a different secret, the stored hashes will never match incoming lookups. Additionally, anyone who knows the fallback string can brute-force the seeded CPFs offline.

**Fix:**
```typescript
// seed.ts lines 7-10 — remove fallback, match production behaviour
function hashCpf(cpf: string): string {
  const secret = process.env.CPF_SECRET
  if (!secret) throw new Error('CPF_SECRET environment variable is required')
  return createHmac('sha256', secret).update(cpf).digest('hex')
}
```

---

### WR-02: `GET /tenants` returns full rows including `approvalStatus` / `rejectionReason` to any ADMIN

**File:** `apps/api/src/modules/tenants/tenants.routes.ts:56-61`
**Issue:** `prisma.tenant.findMany()` with no `select` exposes `approvalStatus`, `rejectionReason`, `destinationId`, and `updatedAt` for every tenant on the platform to any tenant-scoped ADMIN. An ADMIN of one tenant can enumerate approval/rejection data for all other tenants — a data isolation gap.

**Fix:** Either scope the query to the caller's tenant or restrict to SUPER_ADMIN:
```typescript
app.get('/tenants', {
  preHandler: [authenticate, authorize(['ADMIN'])],
}, async (request, reply) => {
  const user = request.user as { tenantId: string }
  const tenants = await prisma.tenant.findMany({
    where: { id: user.tenantId },
    select: { id: true, name: true, slug: true },
  })
  return tenants
})
```
If a platform-wide list is needed, change `authorize(['ADMIN'])` to `authorize(['SUPER_ADMIN'])`.

---

### WR-03: Middleware `/painel` guard ordering is fragile

**File:** `apps/web/middleware.ts:24-28`
**Issue:** The guard `pathname.includes("/painel") && token?.role !== "CONDUTOR"` runs before the `startsWith('/super-admin')` guard (line 36). A hypothetical `/super-admin/.../painel/...` path would redirect a SUPER_ADMIN to `/{slug}/login?error=forbidden` instead of letting them through. The path doesn't exist today, but the guard is structurally fragile and will silently misbehave if such a path is introduced.

**Fix:**
```typescript
if (
  pathname.includes("/painel") &&
  !pathname.startsWith('/super-admin') &&
  token?.role !== "CONDUTOR"
) {
  return NextResponse.redirect(
    new URL(`/${slug}/login?error=forbidden`, req.url)
  )
}
```

---

### WR-04: `approval.test.ts` does not test the idempotency guard (409 on already-processed tenant)

**File:** `apps/api/src/modules/tenants/__tests__/approval.test.ts:83-128`
**Issue:** `tenants.routes.ts` has an explicit guard `if (tenant.approvalStatus !== 'PENDING') throw new AppError('Operadora já foi processada', 409)` on both approve and reject. The test suite covers the 200 approve, 403 forbidden, and 200 reject branches — but never exercises 409. The guard could be removed silently without any test failing, enabling double-approval or double-rejection.

**Fix:** Add two test cases:
```typescript
it('PATCH /tenants/:id/approve on already-approved tenant returns 409', async () => {
  prismaMock.tenant.findUnique.mockResolvedValue({
    ...mockTenant,
    approvalStatus: 'APPROVED',
  })
  const res = await app.inject({
    method: 'PATCH',
    url: '/tenants/tenant-abc/approve',
    headers: { Authorization: `Bearer ${superAdminToken}` },
  })
  expect(res.statusCode).toBe(409)
})

it('PATCH /tenants/:id/reject on already-rejected tenant returns 409', async () => {
  prismaMock.tenant.findUnique.mockResolvedValue({
    ...mockTenant,
    approvalStatus: 'REJECTED',
  })
  const res = await app.inject({
    method: 'PATCH',
    url: '/tenants/tenant-abc/reject',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    payload: { reason: 'Motivo qualquer' },
  })
  expect(res.statusCode).toBe(409)
})
```

---

## Info

### IN-01: `seed.ts` logs plaintext credentials to stdout

**File:** `apps/api/prisma/seed.ts:224-228`
**Issue:** The seed prints passwords in plaintext (`senha123`, `superadmin123`). In CI/CD these appear in build logs. The SUPER_ADMIN password matches the env-var default, making the logged credentials accurate for any deployment that omits `SUPER_ADMIN_PASSWORD`.

**Fix:** Log a reminder to rotate credentials instead of printing actual values, or suppress password lines outside a `NODE_ENV=development` guard.

---

### IN-02: `onboarding/page.tsx` — "Já tem conta?" link is a non-functional `<span>`

**File:** `apps/web/app/onboarding/page.tsx:318-321`
**Issue:** "Acesse o painel da sua operadora." is a `<span>` with `cursor: pointer` but no `href`, `onClick`, or routing. It appears interactive but does nothing on click.

**Fix:**
```tsx
<a href="/login" style={{ color: "var(--ochre)", textDecoration: "none" }}>
  Acesse o painel da sua operadora.
</a>
```

---

### IN-03: `cpf-hash.test.ts` — module cache not reset before the "throws" test

**File:** `apps/api/src/modules/bookings/__tests__/cpf-hash.test.ts:20-24`
**Issue:** The "throws when CPF_SECRET is not set" test deletes `process.env.CPF_SECRET` and dynamic-imports the module, but never calls `vi.resetModules()`. The production `hashCpf` reads `process.env.CPF_SECRET` on each invocation (not at module load), so the test passes today. However, if the module is ever refactored to cache the secret at load time, the test would silently give a false positive because the already-loaded cached module would be returned.

**Fix:**
```typescript
it('throws when CPF_SECRET is not set', async () => {
  vi.resetModules()
  delete process.env.CPF_SECRET
  const { hashCpf } = await import('../../../shared/utils/hash')
  expect(() => hashCpf('12345678901')).toThrow('CPF_SECRET')
})
```

---

### IN-04: `GET /tenants/check-slug` does not validate slug format

**File:** `apps/api/src/modules/tenants/tenants.routes.ts:150`
**Issue:** The check-slug query schema uses `z.string().min(1)` only, without the slug format regex applied in `signupBodySchema`. A caller can query availability for malformed slugs like `"--bad"` or `"UPPER"` and receive `available: true`, then be blocked only at signup time. This creates a misleading UX: the frontend shows "available" for a slug the user can never actually register.

**Fix:**
```typescript
query = z.object({
  slug: z
    .string()
    .min(1, { message: 'Slug obrigatório' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Formato de slug inválido' }),
}).parse(request.query)
```

---

_Reviewed: 2026-05-19T23:45:00-03:00_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
