---
phase: "05"
plan: "06"
subsystem: frontend-guide-profile-admin
tags: [guide-profile, admin-approval, portfolio, badge, legacy-cleanup]
dependency_graph:
  requires: [05-05]
  provides: [guide-profile-ui, admin-approval-ui, portfolio-photos-api]
  affects: [guides.routes, perfil/page, admin/guias/page]
tech_stack:
  added: []
  patterns: [client-component-form, optimistic-update, proxy-fetch, modal-reject]
key_files:
  created:
    - apps/web/app/[slug]/(painel)/painel/perfil/page.tsx
    - apps/web/app/[slug]/(admin)/admin/guias/page.tsx
    - apps/api/src/__tests__/bookings-b1.test.ts
    - apps/api/src/__tests__/tenants.test.ts
  modified:
    - apps/api/src/modules/guides/guides.routes.ts
    - apps/web/app/[slug]/(painel)/painel/dashboard/page.tsx
    - apps/web/app/[slug]/(painel)/painel/disponibilidade/page.tsx
    - apps/web/app/[slug]/(admin)/admin/tenants/page.tsx
  deleted:
    - apps/web/app/dashboard/page.tsx
    - apps/web/app/dashboard/reservas/page.tsx
decisions:
  - "Removed approvalStatus guard on PATCH guides/me/profile — PENDING conductors must complete profile before approval (chicken-and-egg fix)"
  - "Rejeitar flow uses modal with required textarea; Aprovar is direct PATCH without confirmation"
  - "Badge Guia Verificado conditioned on approvalStatus === APPROVED from /auth/me response"
  - "portfolioPhotos accepted as string[] with URL validation in Zod schema"
metrics:
  duration_minutes: 320
  completed_date: "2026-05-12"
  tasks_completed: 4
  files_changed: 11
---

# Phase 5 Plan 06: Perfil do Guia + Aprovacao Admin Summary

**One-liner:** Guide self-profile editor with Guia Verificado badge, portfolio photo management, and admin approval/rejection screen with reason modal — plus 6 integration bug fixes from audit.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| GUIDE-01 | Guide perfil page — bio, especialidades, regioes form | 415b69c |
| GUIDE-02 | Guia Verificado badge on approvalStatus APPROVED | 415b69c |
| GUIDE-04 | portfolioPhotos API support (Zod + Prisma persist) | db85f89 |
| GUIDE-03 | Admin guias page — approve direct, reject via modal + legacy dashboard removal | 6a5f0d0 |
| Bug fixes | 6 integration bugs from audit (B1–B6) | 7c05189 |
| Text fixes | Diacritic corrections in perfil + admin/guias | a2c54e4 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] B1: Dashboard packages fetch missing conductorId param**
- Found during: post-implementation audit
- Issue: dashboard fetched all tenant packages instead of conductor-owned ones
- Fix: added `?conductorId=${user.id}` to fetch URL
- Files: apps/web/app/[slug]/(painel)/painel/dashboard/page.tsx
- Commit: 7c05189

**2. [Rule 1 - Bug] B2: Dead getServerSession call in dashboard**
- Found during: audit
- Issue: unused session variable from old pattern
- Fix: removed import and call
- Files: apps/web/app/[slug]/(painel)/painel/dashboard/page.tsx
- Commit: 7c05189

**3. [Rule 2 - Missing Critical Functionality] B3: approvalStatus guard blocked PENDING conductors from editing profile**
- Found during: audit
- Issue: Zod schema or route guard prevented PENDING guides from saving profile — chicken-and-egg (must have profile to be approved, but blocked until approved)
- Fix: removed approvalStatus === APPROVED guard from PATCH guides/me/profile
- Files: apps/api/src/modules/guides/guides.routes.ts
- Commit: 7c05189

**4. [Rule 1 - Bug] B4: admin/guias double render from Promise.use pattern**
- Found during: audit
- Issue: Promise.resolve(params) caused double render cycle inconsistent with other client components
- Fix: replaced with use(params) from React 19
- Files: apps/web/app/[slug]/(admin)/admin/guias/page.tsx
- Commit: 7c05189

**5. [Rule 1 - Bug] B5: disponibilidade used wrong SlotStatus enum values**
- Found during: audit
- Issue: "CLOSED"/"DEPARTED" not in SlotStatus — TS2367 errors at runtime
- Fix: replaced with correct "CANCELLED"/"COMPLETED" values
- Files: apps/web/app/[slug]/(painel)/painel/disponibilidade/page.tsx
- Commit: 7c05189

**6. [Rule 1 - Bug] B6: test JWT fixtures missing required name field**
- Found during: audit
- Issue: FastifyJWT type breach — name field required by plugin but absent in test helpers
- Fix: added name field to all JWT test fixtures
- Files: apps/api/src/__tests__/helpers/, apps/api/src/__tests__/bookings-b1.test.ts
- Commit: 7c05189

**7. [Rule 1 - Bug] Diacritic typos in Portuguese UI strings**
- Found during: review
- Issue: "Aprovacao", "Acoes", "rejeicao", "podera", "virgula", "Nao foi possivel" missing accents
- Fix: corrected all to proper Portuguese
- Files: admin/guias/page.tsx, perfil/page.tsx
- Commit: a2c54e4

## Known Stubs

None — all data sources are wired to live API endpoints.

## Threat Flags

None — no new network endpoints or auth paths introduced beyond what was planned.

## Self-Check: PASSED

- apps/web/app/[slug]/(painel)/painel/perfil/page.tsx — exists
- apps/web/app/[slug]/(admin)/admin/guias/page.tsx — exists
- apps/api/src/modules/guides/guides.routes.ts — modified
- Commits 415b69c, db85f89, 6a5f0d0, 7c05189, a2c54e4 — all present in git log
- Legacy apps/web/app/dashboard/ — deleted
