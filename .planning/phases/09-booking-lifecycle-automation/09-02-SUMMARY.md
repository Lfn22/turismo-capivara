---
phase: 09-booking-lifecycle-automation
plan: "02"
subsystem: email-templates
tags: [email, notifications, plain-text, bookings]
dependency_graph:
  requires: []
  provides:
    - bookingCreatedEmailText
    - bookingCreatedSubject
    - bookingConfirmedEmailText
    - bookingConfirmedSubject
    - bookingExpiredEmailText
    - bookingExpiredSubject
    - guideApprovedEmailText
    - guideApprovedSubject
  affects:
    - apps/api/src/modules/bookings/bookings.routes.ts
    - apps/api/src/modules/webhooks/webhooks.routes.ts
tech_stack:
  added: []
  patterns:
    - Plain-text template literals following tenants/emails/approval-email.ts pattern
    - Named interface + exported function returning string
    - Subject exported as string constant
key_files:
  created:
    - apps/api/src/modules/bookings/emails/booking-created-email.ts
    - apps/api/src/modules/bookings/emails/booking-confirmed-email.ts
    - apps/api/src/modules/bookings/emails/booking-expired-email.ts
    - apps/api/src/modules/bookings/emails/guide-approved-email.ts
  modified: []
decisions:
  - "Plain text emails only (no HTML, no React Email) per D-01"
  - "Guide panel URL: https://capi.turismo/[slug]/guia/perfil per D-14"
  - "Subjects exported as string constants (not functions) since they don't need parameterization"
metrics:
  duration: "~5 minutes"
  completed: "2026-05-20T11:25:00Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 9 Plan 02: Email Templates Summary

Four plain-text email template modules created in PT-BR for booking lifecycle events (NOTIF-01 to NOTIF-04), following the exact pattern of `tenants/emails/approval-email.ts`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | booking-created + booking-confirmed templates | 449f735 | booking-created-email.ts, booking-confirmed-email.ts |
| 2 | booking-expired + guide-approved templates | 5463f98 | booking-expired-email.ts, guide-approved-email.ts |

## What Was Built

- `booking-created-email.ts` — NOTIF-01: notifica cliente com código PIX, link de pagamento e prazo de expiração
- `booking-confirmed-email.ts` — NOTIF-02: confirma reserva com dados do passeio, guia, data e ponto de encontro
- `booking-expired-email.ts` — NOTIF-04: notifica cliente de reserva expirada com link para nova reserva
- `guide-approved-email.ts` — NOTIF-03: notifica guia aprovado com URL do painel `/guia/perfil`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — these are pure template functions; they do not send emails themselves. Integration with Resend is handled by Plans 03, 04, and 05.

## Threat Surface Scan

No new network endpoints, auth paths, file access, or schema changes introduced. Templates are pure functions operating on caller-supplied strings.

## Self-Check: PASSED

- [x] `apps/api/src/modules/bookings/emails/booking-created-email.ts` — exists
- [x] `apps/api/src/modules/bookings/emails/booking-confirmed-email.ts` — exists
- [x] `apps/api/src/modules/bookings/emails/booking-expired-email.ts` — exists
- [x] `apps/api/src/modules/bookings/emails/guide-approved-email.ts` — exists
- [x] Commits 449f735 and 5463f98 — confirmed in git log
- [x] TypeScript compiles without errors (`pnpm --filter api exec tsc --noEmit` exits 0)
- [x] No HTML tags in any template file
