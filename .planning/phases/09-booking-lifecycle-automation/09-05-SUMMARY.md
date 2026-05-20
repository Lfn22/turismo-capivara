---
phase: 9
plan: "09-05"
subsystem: "notifications"
tags: ["email", "resend", "guides", "NOTIF-03", "gap-closure"]
dependency_graph:
  requires: ["09-02"]
  provides: ["NOTIF-03"]
  affects: ["guides.routes.ts"]
tech_stack:
  added: []
  patterns: ["fire-and-forget Resend email", "getResend() helper"]
key_files:
  created: []
  modified:
    - "apps/api/src/modules/guides/guides.routes.ts"
decisions:
  - "Fire-and-forget pattern (no await) — D-12 from CONTEXT.md"
  - "getResend() returns null when RESEND_API_KEY absent — graceful degradation"
metrics:
  duration: "5min"
  completed: "2026-05-20T08:47:54-03:00"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 1
---

# Phase 9 Plan 05: Wire NOTIF-03 Guide Approval Email Summary

**One-liner:** Wired fire-and-forget Resend email to guide approve handler using guideApprovedEmailText + getResend() pattern, closing gap identified in 09-VERIFICATION.md.

## Tasks Completed

| # | Name | Commit | Status |
|---|------|--------|--------|
| 1 | Add Resend and email imports | 1cf4769 | Done |
| 2 | Add getResend() helper | 1cf4769 | Done |
| 3 | Expand guideProfile query + fire NOTIF-03 | 1cf4769 | Done |

## What Was Done

- Added `import { Resend } from 'resend'` and `import { guideApprovedEmailText, guideApprovedSubject } from '../bookings/emails/guide-approved-email'` to guides.routes.ts
- Added `getResend(): Resend | null` helper (gracefully returns null when RESEND_API_KEY absent)
- Expanded `guideProfile` Prisma select to include `user.name` and `user.email`
- After `prisma.user.update` in the approve handler: fire-and-forget `resend.emails.send(...)` with `.catch()` logging via `app.log.warn`

## Must-Have Verification

- [x] `Resend` and `guide-approved-email` imports present in guides.routes.ts
- [x] `getResend()` helper defined before `guidesRoutes`
- [x] `guideProfile` query selects `user.name` and `user.email`
- [x] Fire-and-forget email sent after `prisma.user.update` in approve handler
- [x] No `await` on email send (fire-and-forget, D-12 pattern)

## Deviations from Plan

None — plan executed exactly as written. Code was already committed (`1cf4769`) from a prior session; this execution run produced the SUMMARY and documentation artifacts.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints or auth paths introduced; this change adds an outbound email call inside an existing ADMIN-only handler.

## Self-Check: PASSED

- File `apps/api/src/modules/guides/guides.routes.ts` — confirmed modified
- Commit `1cf4769` — confirmed in git log
