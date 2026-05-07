---
phase: 05-painel-do-guia
plan: "01"
subsystem: api-guides + web-deps
tags: [guides, bookings, profile, next-auth, react-calendar, fastify]
dependency_graph:
  requires: []
  provides:
    - GET /tenants/:slug/guides/me/bookings (CONDUTOR-scoped)
    - PATCH /tenants/:slug/guides/me/profile (CONDUTOR-scoped)
    - next-auth@4.24.14 in @turismo/web
    - react-calendar@6.0.1 in @turismo/web
  affects:
    - apps/api/src/modules/guides/guides.routes.ts
    - apps/web/package.json
    - pnpm-lock.yaml
tech_stack:
  added:
    - next-auth@4.24.14
    - react-calendar@6.0.1
    - "@types/react-calendar@^4.1.0 (dev)"
  patterns:
    - preHandler: [authenticate, authorize(['CONDUTOR'])] — role-scoped endpoints
    - conductorId from JWT.sub — never from request params (T-05-02 mitigation)
key_files:
  modified:
    - apps/api/src/modules/guides/guides.routes.ts
    - apps/api/src/services/payment.service.ts
    - apps/web/package.json
    - pnpm-lock.yaml
  created:
    - apps/web/.env.local (gitignored — not committed)
decisions:
  - authenticate middleware already handles cross-tenant check via slug lookup; endpoints add explicit tenant.id === conductor.tenantId check for defense-in-depth
  - NEXTAUTH_SECRET generated with crypto.randomBytes(32) — stored only in .env.local (gitignored)
metrics:
  duration: "~8 minutes"
  completed: "2026-05-07T17:46:35Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
---

# Phase 5 Plan 01: API Gaps + Frontend Dependencies Summary

**One-liner:** Two CONDUTOR-scoped guide endpoints (bookings list + profile update) added to Fastify API; next-auth@4.24.14 and react-calendar@6.0.1 installed in Next.js web app.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add GET /guides/me/bookings and PATCH /guides/me/profile | dbcc59d | guides.routes.ts, payment.service.ts |
| 2 | Install next-auth + react-calendar, provision .env.local | a967c1a | package.json, pnpm-lock.yaml |

## What Was Built

**Task 1 — API endpoints:**
- `GET /tenants/:slug/guides/me/bookings` — returns all bookings for the authenticated CONDUTOR, filtered by `conductorId: JWT.sub` via nested Prisma relation (DepartureSlot → TourPackage). Ordered by `createdAt desc`. Includes slot + package details.
- `PATCH /tenants/:slug/guides/me/profile` — updates the CONDUTOR's own `GuideProfile` (bio, photoUrl, especialidades, regioes). Uses `where: { userId: JWT.sub }` — conductor cannot update another guide's profile.
- `updateProfileBodySchema` added for Zod validation of PATCH body.
- `authenticate` and `authorize` imported and applied as `preHandler` on both endpoints.

**Task 2 — Frontend dependencies:**
- `next-auth@4.24.14` and `react-calendar@6.0.1` added to `@turismo/web` dependencies.
- `@types/react-calendar` added as devDependency.
- `apps/web/.env.local` provisioned with `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `API_URL`, `NEXT_PUBLIC_API_URL`. File is gitignored via `apps/web/.gitignore` (`*.env*` pattern) and root `.gitignore` (`.env.local` entry).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing TS error in payment.service.ts blocking build**
- **Found during:** Task 1 build verification
- **Issue:** `payment_type_id: 'bank_transfer'` not in `PaymentCreateRequest` type from mercadopago SDK. Field is redundant — `payment_method_id: 'pix'` already implies the payment type.
- **Fix:** Removed `payment_type_id` line from `attemptCreatePayment` body.
- **Files modified:** `apps/api/src/services/payment.service.ts`
- **Commit:** dbcc59d

**2. [Rule 3 - Blocking] Prisma client stale after Phase 4 schema migration**
- **Found during:** Task 1 build verification
- **Issue:** Multiple TS errors about missing fields (`paymentUrl`, `customerCpf`, `EXPIRED` status) because Prisma client was not regenerated after Phase 4 schema additions.
- **Fix:** Ran `pnpm --filter @turismo/api exec prisma generate` — resolved all schema-drift errors.
- **Files modified:** None (generated output, not committed separately)
- **Commit:** included in dbcc59d

## Security Notes

- T-05-01 mitigated: `authorize(['CONDUTOR'])` rejects ADMIN/ATENDENTE/CLIENTE on both new endpoints.
- T-05-02 mitigated: `conductorId` sourced exclusively from `JWT.sub` — never from URL params or request body.
- T-05-03 mitigated: `guideProfile.update where { userId: JWT.sub }` — conductor edits only own profile.
- T-05-04 mitigated: `.env.local` confirmed gitignored in both `apps/web/.gitignore` and root `.gitignore`.

## Self-Check: PASSED

- `guides.routes.ts` contains `guides/me/bookings` ✓
- `guides.routes.ts` contains `guides/me/profile` ✓
- `guides.routes.ts` contains `updateProfileBodySchema` ✓
- `guides.routes.ts` contains `conductorId: conductor.sub` ✓
- `guides.routes.ts` contains `guideProfile.update` ✓
- `apps/web/package.json` contains `"next-auth": "4.24.14"` ✓
- `apps/web/package.json` contains `"react-calendar": "6.0.1"` ✓
- `.env.local` contains `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `API_URL` ✓
- API build exits 0 ✓
- Commits dbcc59d and a967c1a exist in git log ✓
