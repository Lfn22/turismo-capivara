---
plan: 12-02
phase: 12-login-global
status: complete
---

# Plan 12-02: API Auth Routes

## What was built

Three new Fastify routes implementing the global login flow: tenant lookup by email, password reset token request (hashed token stored, sent via Resend with console fallback), and password reset confirmation (token verified, password updated via bcrypt, token marked usedAt). Prisma client was regenerated to include the PasswordResetToken model added in Wave 1.

## Files created/modified

- `apps/api/src/modules/auth/routes/lookup-tenant.ts` — POST /auth/lookup-tenant: finds user's tenant by email, returns tenantName + tenantSlug, generic response for unknown emails
- `apps/api/src/modules/auth/routes/request-password-reset.ts` — POST /auth/request-password-reset: generates cryptographically secure token, stores SHA-256 hash, sends reset link via Resend (console.log fallback when RESEND_API_KEY absent)
- `apps/api/src/modules/auth/routes/reset-password.ts` — PUT /auth/reset-password: verifies hashed token, checks expiry + usedAt, updates password (bcrypt), marks token usedAt in single $transaction
- `apps/api/src/modules/auth/auth.routes.ts` — registered the three new route modules via app.register()

## Deviations from Plan

**[Rule 3 - Blocking] Prisma client regenerated**
- Found during: Task 1 (TypeScript build)
- Issue: Prisma client did not include PasswordResetToken model (generated before Wave 1 migration) and email was not recognized as a standalone unique field
- Fix: ran `prisma generate` to regenerate client from updated schema
- Commit: d5d2824

## Self-Check

- [x] POST /auth/lookup-tenant resolves tenant from email
- [x] Unknown email returns generic message (no enumeration)
- [x] POST /auth/request-password-reset sends reset email with 1-hour token
- [x] PUT /auth/reset-password verifies token, updates password, marks usedAt
- [x] Token can only be used once (usedAt guard + expiry check)
- [x] TypeScript build passes (`tsc` exits 0)

## Self-Check: PASSED

All three route files exist and commit d5d2824 is present in git log.
