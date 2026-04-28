---
phase: "02"
plan: "04"
subsystem: guides
tags: [guides, public-api, admin-api, approval, jwt, zod]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [guides-list, guide-detail, admin-approval]
  affects: [app.ts]
tech_stack:
  added: []
  patterns: [fastify-plugin, zod-validation, jwt-verify, prisma-findFirst-cross-tenant]
key_files:
  created:
    - apps/api/src/modules/guides/guides.routes.ts
  modified:
    - apps/api/src/app.ts
decisions:
  - "Public endpoints filter approvalStatus=APPROVED at DB level (hides PENDING/REJECTED without extra round-trip)"
  - "Admin endpoints use admin.tenantId from JWT for all DB filters (cross-tenant protection)"
  - "reject endpoint stores body.reason in rejectionReason on User model"
metrics:
  duration: "PT10M"
  completed: "2026-04-28T17:21:39Z"
  tasks_completed: 2
  files_changed: 2
---

# Phase 02 Plan 04: Guides Module Summary

Implemented the guides module exposing 5 endpoints: 2 public (list/detail of approved guides) and 3 admin (list by status, approve, reject). Registered the plugin in app.ts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create guides.routes.ts (5 endpoints) | 826a8b3 | apps/api/src/modules/guides/guides.routes.ts |
| 2 | Register guidesRoutes in app.ts | 663136d | apps/api/src/app.ts |

## Endpoints Implemented

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /tenants/:slug/guides | Public | List approved guides |
| GET | /tenants/:slug/guides/:id | Public | Single approved guide detail |
| GET | /tenants/:slug/admin/guides?status= | JWT + ADMIN | List guides by approval status |
| PATCH | /tenants/:slug/admin/guides/:id/approve | JWT + ADMIN | Approve a guide |
| PATCH | /tenants/:slug/admin/guides/:id/reject | JWT + ADMIN | Reject a guide with reason |

## Security Notes

- All admin endpoints call `request.jwtVerify()` as first operation before any business logic
- Role check (`role !== 'ADMIN'`) throws 403 immediately after JWT verification
- Cross-tenant protection: all admin DB queries filter by `admin.tenantId` from JWT (not from URL slug alone)
- Public endpoints reveal only `approvalStatus = 'APPROVED'` guides at the DB query level
- The reject endpoint saves `rejectionReason` to the User model as required by schema

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- apps/api/src/modules/guides/guides.routes.ts: EXISTS
- apps/api/src/app.ts imports and registers guidesRoutes: CONFIRMED
- TypeScript compilation: PASSED (no errors)
- Commits 826a8b3 and 663136d: CONFIRMED in git log
