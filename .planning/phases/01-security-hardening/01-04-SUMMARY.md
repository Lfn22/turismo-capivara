---
phase: 01-security-hardening
plan: "04"
subsystem: api/users
tags: [lgpd, privacy, anonymization, data-rights, sec-04]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [lgpd-export-endpoint, lgpd-anonymization-endpoint]
  affects: [app.ts, users-module]
tech_stack:
  added: [node:crypto/createHash]
  patterns: [sha256-anonymization, prisma-select-projection, preHandler-auth-gate]
key_files:
  created:
    - apps/api/src/modules/users/users.routes.ts
  modified:
    - apps/api/src/app.ts
decisions:
  - Booking rows preserved after anonymization (D-12 compliance — transactional history for disputes)
  - Booking lookup by customerEmail (not userId — Booking model has no userId field)
  - ANONYMIZATION_SALT from env var with dev fallback string (production must set in Railway)
  - userId sourced from request.user.sub (JWT claim) — never from request body or query param (T-04-01)
metrics:
  duration: ~5m
  completed_date: "2026-04-20"
  tasks_completed: 2
  files_modified: 2
---

# Phase 1 Plan 04: LGPD Data Rights Endpoints Summary

SEC-04 satisfied: LGPD right-of-access (GET export) and right-of-erasure (DELETE anonymize) with SHA-256 PII anonymization and booking history preservation.

## What Was Built

Two LGPD-compliant endpoints under `/tenants/:slug/users/me`:

- `GET /tenants/:slug/users/me/export` — returns `{ user: { id, name, email, role, createdAt }, bookings: [{ id, slotId, status, createdAt }] }` scoped to the authenticated user
- `DELETE /tenants/:slug/users/me` — anonymizes `name` to `'Usuário Removido'` and `email` to SHA-256(originalEmail + ANONYMIZATION_SALT); booking rows are preserved untouched

Both endpoints require a valid JWT (handled by the `authenticate` middleware from plan 01-02, which also enforces the cross-tenant ownership check).

## Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create users.routes.ts with LGPD endpoints | 038538f | apps/api/src/modules/users/users.routes.ts |
| 2 | Register usersRoutes in app.ts | 801aee3 | apps/api/src/app.ts |

## Key Design Decisions

**Booking linkage by customerEmail:** The `Booking` model has no `userId` field — bookings are linked to users only via `customerEmail`. The export endpoint queries `prisma.booking.findMany({ where: { customerEmail: user.email } })`.

**Booking preservation on DELETE:** Per LGPD and D-12, transactional history is preserved for dispute resolution. The DELETE handler only calls `prisma.user.update` — no `prisma.booking` mutations.

**Salt configuration:** `ANONYMIZATION_SALT` must be set in Railway for production. Dev fallback `'capivara-lgpd-salt-dev'` is intentional and documented.

**No inline reply.status(4xx):** Business logic errors use `throw new AppError(message, statusCode)` — the global error handler from plan 01-01 handles the response. Auth errors are handled by the `authenticate` middleware.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

All threats addressed per the plan's STRIDE register:

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-04-01 Spoofing (userId) | userId from `request.user.sub`, never from request params | Implemented |
| T-04-02 Info Disclosure (password hash) | Prisma `select` limits fields; password not in response | Implemented |
| T-04-03 Tampering (WHERE clause) | `where: { id: userId }` from JWT, no caller-controlled input | Implemented |
| T-04-04 Salt leakage | `process.env.ANONYMIZATION_SALT` with dev fallback only | Implemented |
| T-04-05 Repudiation | Booking rows preserved for dispute history | By design |
| T-04-06 Privilege escalation | authenticate middleware cross-tenant check (01-02) | Inherited |

No new threat surface beyond what is in the plan's threat model.

## Self-Check: PASSED

- `apps/api/src/modules/users/users.routes.ts` — FOUND
- `apps/api/src/app.ts` contains `app.register(usersRoutes)` — FOUND
- Commit `038538f` — FOUND
- Commit `801aee3` — FOUND
- `npx tsc --noEmit` exits 0 — PASSED
