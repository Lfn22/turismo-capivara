# Phase 11 Plan 04: Inline Style → Tailwind + Token Migration Summary

## Objective

Migrate PublicNav and BookingForm from `React.CSSProperties` inline style objects to Tailwind `className` + CSS token-based styles. Replace structural hex literals in MinhaReservaClient, CheckoutClient, and ConfirmationCard with CSS tokens. Semantic status/error colors preserved.

## Completed Tasks

- [x] **Task 1**: PublicNav — `React.CSSProperties` objects removed, layout converted to Tailwind, brand token colors use `var(--ochre)` inline
- [x] **Task 2**: BookingForm — Named style objects removed, layout to Tailwind, 2 semantic error hex literals retained (`#fef2f2`, `#b91c1c`)
- [x] **Task 3**: MinhaReservaClient — Structural hex replaced with tokens; status badge map (PENDING/CONFIRMED/EXPIRED/CANCELLED), WhatsApp brand color, and state-conditional backgrounds preserved as semantic
- [x] **Task 4**: CheckoutClient — Structural hex replaced; success/cancelled/expired state hex and error colors preserved as semantic
- [x] **Task 5**: ConfirmationCard — Status color map (CONFIRMED/PENDING/CANCELLED/COMPLETED) and SVG stroke preserved as semantic

## Artifacts Modified

### apps/web/src/components/layout/PublicNav.tsx
- Removed `React.CSSProperties` named objects
- Layout/spacing/typography → Tailwind utilities
- Brand token: `var(--ochre)` via inline style (not in Tailwind defaults)

### apps/web/src/components/ui/BookingForm.tsx
- Removed named `inputStyle`/`labelStyle` CSSProperties objects
- Layout → Tailwind className
- 2 semantic error colors retained (error state background/text)

### apps/web/src/components/ui/MinhaReservaClient.tsx
- Structural layout hex → CSS tokens / Tailwind
- Status badge color map preserved (booking state colors)
- WhatsApp brand `#25D366` preserved (third-party brand)

### apps/web/src/components/ui/CheckoutClient.tsx
- Structural hex → CSS tokens / Tailwind
- Conditional state backgrounds (success/cancelled/expired) preserved as semantic

### apps/web/src/components/ui/ConfirmationCard.tsx
- Status color map preserved (semantic booking states)
- SVG checkmark stroke preserved

## Verification Results

| Check | Result |
|-------|--------|
| `grep React\.CSSProperties PublicNav.tsx BookingForm.tsx` | PASS — 0 matches |
| `grep hex PublicNav.tsx` | PASS — 0 hex |
| `grep hex BookingForm.tsx` | PASS — 2 semantic error lines only |
| `MinhaReservaClient.tsx` hex remaining | Semantic status/brand only |
| `CheckoutClient.tsx` hex remaining | Semantic state colors only |
| `ConfirmationCard.tsx` hex remaining | Semantic status map only |

## Requirements Coverage

| Requirement | Status |
|-------------|--------|
| STYLE-01 — hex literals → tokens | ✓ Structural hex removed across all 5 files |
| STYLE-02 — CSS architecture unified | ✓ CSSProperties objects eliminated |
| STYLE-04 — Tailwind className primary | ✓ PublicNav and BookingForm converted |

## Deviations from Plan

- **BookingForm**: 2 semantic error hex literals remain (`#fef2f2`, `#b91c1c`). Plan said "no hex" but error-state colors are semantic — consistent with how MinhaReservaClient/CheckoutClient were handled. No rework needed.

## Key Decisions

- Semantic status/error hex (booking states, brand colors, error feedback) preserved across all files — consistent with how 11-03 treated StickyDestinationNav
- Dynamic conditional styles (e.g. `isSuccess ? '#f0fdf4' : ...`) kept as inline style — cannot be statically expressed in Tailwind without CSS-in-JS

## Self-Check: PASSED

- [x] 5 files modified as specified in plan
- [x] No `React.CSSProperties` named objects remain in PublicNav or BookingForm
- [x] Structural hex removed; semantic hex preserved with rationale
- [x] STYLE-01, STYLE-02, STYLE-04 satisfied
- [x] All commits on branch main
