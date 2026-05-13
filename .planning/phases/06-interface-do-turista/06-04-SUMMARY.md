---
plan: 06-04
status: complete
wave: 3
---
## What was built

Legacy top-level pages replaced by the new `[slug]/(public)/` route group were deleted. The `roteiros/` folder retains sub-pages (`detalhe/`, `slug/`) which are also legacy but out of scope for this plan.

## Tasks completed

1. Remove legacy `app/roteiros/page.tsx` — b84a1c9
2. Remove legacy `app/reservar/page.tsx` (folder also deleted, was empty) — 429b825

## Files deleted

- `apps/web/app/roteiros/page.tsx`
- `apps/web/app/reservar/page.tsx`
- `apps/web/app/reservar/` (folder, now empty)

## Verification

- No `app/roteiros` or `app/reservar` import references remain outside the `(public)` route group
- TypeScript check (source files): clean — zero errors
- `.next/` validator stale references resolve on next build (expected behavior)

## Notes

- `apps/web/app/roteiros/detalhe/` and `apps/web/app/roteiros/slug/` are also legacy pages but were NOT in plan scope — deferred
- `app/page.tsx` still links to `/roteiros` (legacy href) — also out of scope for this plan

## Self-Check: PASSED
