---
plan: 06-03
status: complete
wave: 2
---

## What was built

Four public-facing Next.js pages (RSC/client) for the tourist flow plus Mercado Pago return URL wiring: layout with tenant name fetch, guide listing grid, guide profile with SlotPicker, booking form, and confirmation page.

## Tasks completed

1. Route group layout (`app/[slug]/(public)/layout.tsx`) — e2818bc
2. Guide listing page (`app/[slug]/(public)/guias/page.tsx`) — 2db0f6b
3. Guide profile page with SlotPicker (`app/[slug]/(public)/guias/[guideId]/page.tsx`) — 98e4dc5
4. Reservar booking form page (`app/[slug]/(public)/reservar/page.tsx`) — 901f76d
5. Confirmacao page (`app/[slug]/(public)/confirmacao/page.tsx`) — 48960ea
6. Wire Mercado Pago back_urls (`payment.service.ts` + `bookings.routes.ts`) — ab178dd

## Files created/modified

- `apps/web/app/[slug]/(public)/layout.tsx` — RSC layout, fetches tenant name from API
- `apps/web/app/[slug]/(public)/guias/page.tsx` — guide listing with GuideCard grid
- `apps/web/app/[slug]/(public)/guias/[guideId]/page.tsx` — guide profile + package cards + SlotPicker
- `apps/web/app/[slug]/(public)/reservar/page.tsx` — client component, useSearchParams, BookingForm
- `apps/web/app/[slug]/(public)/confirmacao/page.tsx` — RSC, fetches booking by id+email, ConfirmationCard
- `apps/api/src/services/payment.service.ts` — added buildBackUrls(), slug field to input interface
- `apps/api/src/modules/bookings/bookings.routes.ts` — passes slug to createPixPayment

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing field] Added slug to CreatePixPaymentInput**
- **Found during:** Task 6
- **Issue:** back_urls require slug to build the return URL, but slug was not in the payment service interface
- **Fix:** Added `slug` field to `CreatePixPaymentInput`, updated call site in `bookings.routes.ts`
- **Files modified:** `payment.service.ts`, `bookings.routes.ts`
- **Commit:** ab178dd

**2. [Rule 1 - Bug] customerName/guestName mapping in confirmacao page**
- **Found during:** Task 5
- **Issue:** API returns `customerName` but ConfirmationCard expects `guestName`
- **Fix:** Map `booking.customerName` to `guestName` when constructing card props
- **Files modified:** `confirmacao/page.tsx`
- **Commit:** 48960ea

**3. [Rule 1 - Bug] guias/page.tsx used NEXT_PUBLIC_API_URL (client env) instead of API_URL (server env)**
- **Found during:** Task 2 review
- **Issue:** Page is RSC, should use server-side API_URL not public client env var
- **Fix:** Changed to `process.env.API_URL ?? 'http://localhost:3001'`
- **Files modified:** `guias/page.tsx`
- **Commit:** 2db0f6b

## Self-Check: PASSED
