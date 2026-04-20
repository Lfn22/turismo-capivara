---
phase: 01-security-hardening
fixed_at: 2026-04-20T14:34:00-03:00
review_path: .planning/phases/01-security-hardening/01-REVIEW.md
fix_scope: critical_warning
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
iteration: 1
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-04-20T14:34:00-03:00
**Source review:** .planning/phases/01-security-hardening/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: JWT_SECRET hardcoded fallback removed

**Files modified:** `apps/api/src/app.ts`
**Commit:** cc5007f
**Applied fix:** Replaced `process.env.JWT_SECRET ?? 'desenvolvimento-secret-trocar-em-producao'` with a fail-fast check: throws `Error('JWT_SECRET environment variable is required')` at startup if the env var is absent, then passes the bare `process.env.JWT_SECRET` to `@fastify/jwt`.

### CR-02: Tenant ownership check on slotId

**Files modified:** `apps/api/src/modules/bookings/bookings.routes.ts`
**Commit:** 02b1aeb
**Applied fix:** Inside the `$transaction`, changed `tx.departureSlot.findUnique` to include `{ package: { select: { tenantId: true } } }`. After the null check, added `if (slot.package.tenantId !== tenant.id) throw new AppError('Slot não encontrado', 404)` to prevent cross-tenant slot booking.

### CR-03: Role guard on cancel and confirm PATCH endpoints

**Files modified:** `apps/api/src/modules/bookings/bookings.routes.ts`
**Commit:** 02b1aeb (bundled with CR-02 — both changes were applied to the same file before the atomic commit)
**Applied fix:** Added `authorize(['ADMIN', 'ATENDENTE'])` to the `preHandler` array of both `/tenants/:slug/bookings/:id/cancel` and `/tenants/:slug/bookings/:id/confirm`. The `authorize` middleware already existed at `apps/api/src/shared/middlewares/authorize.ts` and was already imported.

### CR-04: LGPD erasure anonymizes Booking.customerEmail

**Files modified:** `apps/api/src/modules/users/users.routes.ts`
**Commit:** 31a1051
**Applied fix:** Wrapped the `prisma.user.update` call in a `prisma.$transaction`. Inside the transaction, added `tx.booking.updateMany({ where: { customerEmail: existing.email }, data: { customerEmail: anonymizedEmail } })` after the user update, so both the User record and all matching Booking records are anonymized atomically.

### WR-01: ANONYMIZATION_SALT hardcoded fallback removed

**Files modified:** `apps/api/src/modules/users/users.routes.ts`
**Commit:** 31a1051 (bundled with CR-04 — both changes are in the same handler)
**Applied fix:** Replaced `process.env.ANONYMIZATION_SALT ?? 'capivara-lgpd-salt-dev'` with a fail-fast check: reads the env var, then throws `AppError('Configuração de anonimização ausente', 500)` if it is absent. No fallback value remains.

### WR-02: authorize middleware guards against missing request.user

**Files modified:** `apps/api/src/shared/middlewares/authorize.ts`
**Commit:** af0ce73
**Applied fix:** Added `if (!request.user) return reply.status(401).send({ message: 'Não autenticado' })` as the first statement inside the returned handler, before the role check. This prevents a runtime crash when `authorize` is called without a preceding `authenticate` middleware.

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-04-20T14:34:00-03:00_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
