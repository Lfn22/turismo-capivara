---
phase: 06-interface-do-turista
status: gaps_found
verified_at: 2026-05-13
gaps:
  - truth: "Legacy apps/web/app/roteiros/ is deleted"
    status: failed
    reason: "Directory still exists with roteiros/detalhe/page.tsx and roteiros/slug/page.tsx"
    artifacts:
      - path: "apps/web/app/roteiros/detalhe/page.tsx"
        issue: "Legacy page not deleted"
      - path: "apps/web/app/roteiros/slug/page.tsx"
        issue: "Legacy page not deleted"
    missing:
      - "Delete apps/web/app/roteiros/ directory and all contents"
---

# Phase 06: Interface do Turista — Verification Report

**Phase Goal:** Tourist-facing public interface — guide discovery, slot selection, booking flow, confirmation
**Verified:** 2026-05-13
**Status:** gaps_found
**Re-verification:** No — initial verification

## Verification Summary

11/12 must-haves verified. 1 gap blocking full goal achievement.

## Results

| Check | Status | Evidence |
|-------|--------|----------|
| **06-01** GET /tenants/:slug/packages/:id/slots exists | ✓ | `packages.routes.ts:263` — route registered, queries `prisma.departureSlot.findMany` |
| **06-01** GET /tenants/:slug/bookings/:id with email guard | ✓ | `bookings.routes.ts:206,233` — email parsed from query, booking rejected if `customerEmail !== email` |
| **06-01** Response never exposes customerCpf or customerPhone | ✓ | `bookings.routes.ts:237,308,357` — destructured out: `const { customerCpf, customerPhone, ...safeBooking } = booking` |
| **06-02** PublicNav.tsx exists | ✓ | `apps/web/src/components/layout/PublicNav.tsx` |
| **06-02** GuideCard.tsx exists | ✓ | `apps/web/src/components/ui/GuideCard.tsx` |
| **06-02** SlotPicker.tsx exists | ✓ | `apps/web/src/components/ui/SlotPicker.tsx` |
| **06-02** BookingForm.tsx exists | ✓ | `apps/web/src/components/ui/BookingForm.tsx` |
| **06-02** ConfirmationCard.tsx exists | ✓ | `apps/web/src/components/ui/ConfirmationCard.tsx` |
| **06-02** SlotPicker has `'use client'` | ✓ | Line 1: `'use client';` |
| **06-02** BookingForm has `'use client'` | ✓ | Line 1: `'use client';` |
| **06-03** All 5 public routes exist (layout, guias, guias/[guideId], reservar, confirmacao) | ✓ | `apps/web/app/[slug]/(public)/` contains `layout.tsx`, `guias/page.tsx`, `guias/[guideId]/page.tsx`, `reservar/page.tsx`, `confirmacao/page.tsx` |
| **06-03** Payment back_urls use WEB_URL env | ✓ | `payment.service.ts:25` — `process.env.WEB_URL ?? 'http://localhost:3000'` |
| **06-04** Legacy apps/web/app/roteiros/ deleted | ✗ | Directory exists: `roteiros/detalhe/page.tsx`, `roteiros/slug/page.tsx` |
| **06-04** Legacy apps/web/app/reservar/ (top-level) deleted | ✓ | Directory does not exist |

## Gaps

### 1. Legacy `roteiros/` directory not deleted

`apps/web/app/roteiros/` still contains two pages:
- `apps/web/app/roteiros/detalhe/page.tsx`
- `apps/web/app/roteiros/slug/page.tsx`

Plan 06-04 requires deletion. These are placeholder/legacy pages from the pre-multi-tenant routing era. They conflict with the new `[slug]/(public)/` route structure and should be removed.

**Fix:** `rm -rf apps/web/app/roteiros/`

## Notes

- `PublicNav` is a server component (no `'use client'` directive) — acceptable, it only uses `<Link>` with no client interactivity. Plan requirement was export presence, not client directive.
- `apps/web/app/reservar/` top-level is confirmed deleted (plan 06-04 check passed).

## Human Verification Items

1. **Guide listing page renders real data**
   - Test: Navigate to `/{tenant-slug}/guias` in browser
   - Expected: List of approved guides with names, photos, ratings
   - Why human: Data-flow from API to server component render requires live environment

2. **Booking flow end-to-end**
   - Test: Select a slot, fill BookingForm, submit
   - Expected: Booking created, redirect to confirmacao page with booking details
   - Why human: Multi-step form state, PIX QR code render, redirect logic

3. **Email guard on booking lookup**
   - Test: GET `/api/tenants/:slug/bookings/:id?email=wrong@email.com`
   - Expected: 404 response (not 403, to prevent enumeration)
   - Why human: Confirmed in code but real HTTP behavior needs live API test
