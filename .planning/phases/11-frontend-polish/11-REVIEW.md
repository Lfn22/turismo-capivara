---
phase: 11-frontend-polish
reviewed: 2026-06-01T12:00:00Z
depth: standard
files_reviewed: 33
files_reviewed_list:
  - apps/api/prisma/schema.prisma
  - apps/api/src/modules/auth/auth.routes.ts
  - apps/api/src/modules/destinations/destinations.routes.ts
  - apps/web/app/[slug]/(painel)/painel/dashboard/page.tsx
  - apps/web/app/[slug]/(painel)/painel/disponibilidade/page.tsx
  - apps/web/app/[slug]/(painel)/painel/perfil/page.tsx
  - apps/web/app/[slug]/(painel)/painel/reservas/page.tsx
  - apps/web/app/[slug]/(painel)/painel/roteiros/page.tsx
  - apps/web/app/[slug]/(public)/checkout/loading.tsx
  - apps/web/app/[slug]/(public)/checkout/page.tsx
  - apps/web/app/[slug]/(public)/minha-reserva/page.tsx
  - apps/web/app/[slug]/(public)/roteiros/[packageId]/loading.tsx
  - apps/web/app/[slug]/(public)/roteiros/[packageId]/page.tsx
  - apps/web/app/acesso/page.tsx
  - apps/web/app/actions/waitlist.ts
  - apps/web/app/api/destinations/[slug]/route.ts
  - apps/web/app/api/tenant-lookup/route.ts
  - apps/web/app/destinos/[destination-slug]/guias/[guide-id]/page.tsx
  - apps/web/app/destinos/[destination-slug]/guias/page.tsx
  - apps/web/app/destinos/[destination-slug]/loading.tsx
  - apps/web/app/destinos/[destination-slug]/page.tsx
  - apps/web/app/destinos/page.tsx
  - apps/web/app/login/page.tsx
  - apps/web/app/page.tsx
  - apps/web/components/ui/DestinationPhotoEditor.tsx
  - apps/web/src/components/layout/PublicNav.tsx
  - apps/web/src/components/layout/StickyDestinationNav.tsx
  - apps/web/src/components/ui/BackButton.tsx
  - apps/web/src/components/ui/BookingForm.tsx
  - apps/web/src/components/ui/CheckoutClient.tsx
  - apps/web/src/components/ui/ConfirmationCard.tsx
  - apps/web/src/components/ui/ConversionAnchor.tsx
  - apps/web/src/components/ui/MinhaReservaClient.tsx
findings:
  critical: 2
  warning: 5
  info: 4
  total: 11
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-06-01T12:00:00Z
**Depth:** standard
**Files Reviewed:** 33
**Status:** issues_found

## Summary

Phase 11 was a frontend polish phase covering: `BackButton` component (new), waitlist email action, CSS token migration, and loading.tsx flash-fix. The new work is generally clean. Two critical issues exist — one is a client-side security exposure in `BookingForm.tsx` that bypasses the API proxy, and one is an email injection vector in `waitlist.ts`. Five warnings cover logic correctness issues: a broken scroll-direction inversion in `StickyDestinationNav`, unvalidated URL inputs accepted into `background-image` CSS, an unguarded `window.innerWidth` access that will throw during SSR/hydration, the `"Gerenciar Slots"` link being hardcoded to `disponibilidade` ignoring package id, and a polling interval that can accumulate if booking status flips back during concurrent updates.

---

## Critical Issues

### CR-01: BookingForm calls the API directly, exposing NEXT_PUBLIC_API_URL to the browser

**File:** `apps/web/src/components/ui/BookingForm.tsx:45-57`
**Issue:** `BookingForm` is a `'use client'` component that sends the booking `POST` directly to the backend API using `process.env.NEXT_PUBLIC_API_URL`. This bypasses the established proxy pattern used by all other authenticated routes. Any user can inspect the network request to discover the raw API origin URL and craft direct requests that skip Next.js middleware, request validation, and any future rate limiting added at the proxy layer. This is inconsistent with the security architecture of this codebase (see `apps/web/app/api/destinations/[slug]/route.ts` for the correct pattern).

**Fix:** Create a Next.js API route proxy at `/api/[slug]/bookings` and call it from `BookingForm`:
```typescript
// apps/web/app/api/[slug]/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server'
const API_URL = process.env.API_URL ?? 'http://localhost:3333'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.text()
  const res = await fetch(`${API_URL}/tenants/${slug}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  const data = await res.text()
  return new NextResponse(data, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}

// In BookingForm.tsx, replace line 45-46:
const res = await fetch(`/api/${slug}/bookings`, {
```

---

### CR-02: Email input injected into HTML email template without sanitization

**File:** `apps/web/app/actions/waitlist.ts:30`
**Issue:** The `email` parameter received from the client is embedded directly into the HTML body of the notification email sent to `WAITLIST_NOTIFY_EMAIL`:
```typescript
html: `<p>Email: ${email}</p><p>Data: ${new Date().toISOString()}</p>`,
```
Although the `email` field passes a basic `includes('@')` check on line 7, this does not prevent injection. An attacker can submit `attacker@x.com<script>alert(1)</script>` or embed HTML that targets the internal notification recipient's email client. The user-facing email on line 20-24 correctly uses static HTML, so only the admin notification is affected.

**Fix:** Sanitize the email value before interpolation, or use `textContent`-equivalent escaping:
```typescript
const safeEmail = email.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`)
html: `<p>Email: ${safeEmail}</p><p>Data: ${new Date().toISOString()}</p>`,
```
Additionally, tighten the email validation to an actual regex:
```typescript
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!email || !EMAIL_RE.test(email)) return { ok: false, error: 'Email inválido' }
```

---

## Warnings

### WR-01: StickyDestinationNav scroll logic is inverted — hides nav on scroll-down, shows on scroll-up

**File:** `apps/web/src/components/layout/StickyDestinationNav.tsx:67-75`
**Issue:** The scroll direction comments and the `classList` operations are contradictory:
```typescript
if (delta > 0) {
  // Scroll down → mostra nav (se hero já saiu do viewport)   ← comment says "show"
  if (!heroVisible.current) {
    nav.classList.remove('snav--hidden')  // remove hidden = show ✓
  }
} else {
  // Scroll up → esconde nav   ← comment says "hide"
  nav.classList.add('snav--hidden')       // add hidden = hide ✓
}
```
The code and comments actually agree with each other, but the UX is backwards compared to the standard pattern: sticky navs should **appear** when scrolling up (user intends to go back to top) and **hide** when scrolling down (reading content). As implemented, the nav appears on scroll-down and hides on scroll-up — opposite of expected behavior.

**Fix:** Swap the class operations:
```typescript
if (delta > 0) {
  // Scroll down → hide nav
  if (!heroVisible.current) {
    nav.classList.add('snav--hidden')
  }
} else {
  // Scroll up → show nav
  nav.classList.remove('snav--hidden')
}
```

---

### WR-02: Photo URLs from API embedded in CSS background-image without validation

**File:** `apps/web/app/destinos/[destination-slug]/page.tsx:571-572`
**Issue:** User-controlled photo URLs (stored in the `Destination.photos` array) are placed directly into a CSS `background-image` property with no URL validation:
```typescript
style={photos[i]
  ? { backgroundImage: `url(${photos[i]})`, ... }
  : { background: HIGHLIGHT_GRADIENTS[i % HIGHLIGHT_GRADIENTS.length] }}
```
A malicious admin could store a value like `none), url(javascript:...` or inject CSS that breaks out of the `url()` context. While exploitability depends on browser CSS parsing, this is a data-trust issue — values from the database should be validated before embedding in CSS.

**Fix:** Validate each photo URL before use, rejecting non-http(s) URLs (the same pattern already used in `roteiros/[packageId]/page.tsx:275`):
```typescript
const safePhotoUrl = (url: string) => /^https?:\/\//.test(url) ? url : null

style={safePhotoUrl(photos[i])
  ? { backgroundImage: `url(${safePhotoUrl(photos[i])})`, ... }
  : { background: HIGHLIGHT_GRADIENTS[i % HIGHLIGHT_GRADIENTS.length] }}
```

---

### WR-03: `window.innerWidth` accessed during render in MinhaReservaClient — will throw on SSR

**File:** `apps/web/src/components/ui/MinhaReservaClient.tsx:406`
**Issue:** The QR code size is calculated using `window.innerWidth` inside JSX render:
```typescript
size={Math.min(200, typeof window !== 'undefined' ? window.innerWidth * 0.8 : 200)}
```
Although the `typeof window !== 'undefined'` guard prevents a crash, this pattern still causes a hydration mismatch: the server renders `200` (the fallback), the client renders a different value (e.g. `320`), causing a React hydration warning in development and potentially layout shift in production. The component is `'use client'` so SSR is attempted before hydration.

**Fix:** Use a fixed size or derive the size via CSS instead:
```typescript
// Simple fix — let CSS handle responsive sizing via the style prop already present:
size={200}
style={{ height: 'auto', maxWidth: '100%', width: 'min(200px, 80vw)' }}
```

---

### WR-04: Polling interval in CheckoutClient can accumulate after booking status flips

**File:** `apps/web/src/components/ui/CheckoutClient.tsx:96-111`
**Issue:** The polling `useEffect` depends on `[booking?.status, fetchBooking]`. When `fetchBooking` is called inside the interval and resolves a non-PENDING status, it calls `clearInterval(interval)` — but if the component unmounts or `booking.status` changes to non-PENDING and then the effect cleanup runs, a new effect registration could occur before the old interval is cleared. The `cancelled` flag partially mitigates this, but the interval variable is captured in closure and `clearInterval` is called on both the interval reference and via the cleanup — this is correct. However, if `fetchBooking` rejects after status change, the interval is never cleared from within the callback:
```typescript
const status = await fetchBooking()
if (status && status !== 'PENDING') clearInterval(interval)
// if fetchBooking throws, status is undefined → clearInterval never called
```
The outer cleanup `return () => { cancelled = true; clearInterval(interval) }` saves the day in most cases, but the `cancelled` flag and the `clearInterval` both need to fire on rejection.

**Fix:**
```typescript
const interval = setInterval(async () => {
  if (cancelled) return
  try {
    const status = await fetchBooking()
    if (status && status !== 'PENDING') clearInterval(interval)
  } catch {
    clearInterval(interval)
  }
}, 3000)
```

---

### WR-05: `roteiros/page.tsx` — "Gerenciar Slots" links to disponibilidade page without package context

**File:** `apps/web/app/[slug]/(painel)/painel/roteiros/page.tsx:261-277`
**Issue:** Each package card renders a "Gerenciar Slots" link that navigates to `/${slug}/painel/disponibilidade` — a flat URL with no package ID passed. This means every package card links to the same undifferentiated availability page, making it impossible for the disponibilidade page to know which package's slots to show. If the disponibilidade page fetches all slots for the guide (and lets the user pick), this is a UX degradation not a crash; but if it relies on a `packageId` param to preselect or filter, the link is functionally broken.

**Fix:** Pass the package ID as a query parameter so the availability page can preselect:
```typescript
href={`/${slug}/painel/disponibilidade?packageId=${pkg.id}`}
```
Then in the disponibilidade page, read `searchParams.packageId` to preselect the correct package.

---

## Info

### IN-01: `dashboard/page.tsx` uses `as any` to pass headers to `getToken`

**File:** `apps/web/app/[slug]/(painel)/painel/dashboard/page.tsx:51`
**Issue:**
```typescript
const jwt = await getToken({ req: { headers: await headers() } as any, secret: process.env.NEXTAUTH_SECRET })
```
Same pattern in `roteiros/page.tsx:39`. The `as any` suppresses type-checking. This is a known workaround for next-auth's requirement that `req` be a full `IncomingMessage`, but it's worth noting as a type safety gap.

**Fix:** If next-auth exports an adapter for Next.js App Router (some versions do via `getServerSession` + `authOptions`), prefer that. Otherwise, document the cast with a comment explaining it's required by the next-auth API.

---

### IN-02: `login/page.tsx` hardcodes `tenantSlug: "capi-platform"` and `callbackUrl`

**File:** `apps/web/app/login/page.tsx:26-28`
**Issue:** The super-admin login form hardcodes `tenantSlug: "capi-platform"` and `callbackUrl: "/super-admin/operadoras"`. If the platform slug changes or the route structure is updated, this will break silently.

**Fix:** Extract to constants or environment variables:
```typescript
const PLATFORM_TENANT = process.env.NEXT_PUBLIC_PLATFORM_TENANT ?? 'capi-platform'
```

---

### IN-03: `waitlist.ts` does not deduplicate emails — same address can be registered multiple times

**File:** `apps/web/app/actions/waitlist.ts`
**Issue:** There is no persistence layer — each call to `submitWaitlist` just sends an email without checking if the address was already submitted. This is fine for an MVP waitlist, but the admin notification email will accumulate duplicates, and the user receives the same confirmation repeatedly.

**Fix:** Out of v1 scope, but worth tracking. Add a persistent store (KV or database table) before launch.

---

### IN-04: Commented-out `acesso__wordmark` style class defined but never rendered

**File:** `apps/web/app/acesso/page.tsx:88-95`
**Issue:** The `.acesso__wordmark` CSS class is defined in the `<style>` block but no element in the JSX uses `className="acesso__wordmark"`. The logo/brand area now uses an `<Image>` component instead.

**Fix:** Remove the dead `.acesso__wordmark` CSS rule to keep the style block clean:
```css
/* Remove: */
.acesso__wordmark {
  font-family: var(--font-display);
  font-size: 1.25rem;
  ...
}
```

---

_Reviewed: 2026-06-01T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
