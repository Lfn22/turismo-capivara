---
phase: 11-frontend-polish
plan: 01
subsystem: frontend-foundation
tags: [css-reset, brand-migration, page-cleanup, flash-fix]
duration_minutes: 15
completed_date: 2026-05-29T22:30:00Z
one_liner: Global CSS resets for form elements + font fallback syntax fix + root layout CAPI branding and flash elimination
---

# Phase 11 Plan 01: Foundation Fixes Summary

## Objective
Fix global CSS resets, migrate root layout to CAPI branding with flash elimination, and clean up legacy stub pages. Unblocks all downstream style and navigation work.

## Completed Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | globals.css font fallback + form reset | 0f5b658 | apps/web/app/globals.css |
| 2 | layout.tsx CAPI branding + background | 01e71b8 | apps/web/app/layout.tsx |
| 3 | Delete legacy routes | d1b7696 | apps/web/app/dashboard/page.tsx, apps/web/app/destinos/teste/page.tsx |

## Artifacts Created/Modified

### apps/web/app/globals.css
- **Fix AUDIT-04:** Corrected font-display fallback syntax from `var(--font-display), Georgia` to `var(--font-display, Georgia, serif)` (nested fallback)
- **Add AUDIT-05:** New rule for `input, textarea, select, button` with `font-family: inherit` and `font-size: 16px` (prevents iOS Safari auto-zoom)

### apps/web/app/layout.tsx
- **Branding migration (D-10):** Title changed from "Serra da Capivara — Patrimônio Mundial UNESCO" to template `{ template: '%s | CAPI', default: 'CAPI' }`
- **Description update:** Changed from archaeology messaging to marketplace messaging: "Encontre guias certificados, compare roteiros e reserve com PIX."
- **Flash fix (D-09):** Added `style={{ backgroundColor: 'var(--stone-50)' }}` to both `<html>` and `<body>` elements to eliminate white flash before CSS loads

### Deletions
- **apps/web/app/dashboard/page.tsx** — Removed stub dashboard placeholder (STYLE-05, D-08, AUDIT-02)
- **apps/web/app/destinos/teste/page.tsx** — Removed test route (no production use)

## Verification Results

✅ **globals.css verification:**
- `font-family: inherit` present (line 44)
- `var(--font-display), Georgia` pattern eliminated (0 occurrences)
- `var(--font-display, Georgia, serif)` nested syntax present (line 35)
- `font-size: 16px` present (line 45)

✅ **layout.tsx verification:**
- "Serra da Capivara" removed (0 occurrences)
- Title template `'%s | CAPI'` present (line 19)
- Default title `'CAPI'` present (line 19)
- `backgroundColor: var(--stone-50)` appears 2x (html and body elements)

✅ **File deletion verification:**
- `dashboard/page.tsx` not found (test exit 0)
- `destinos/teste/page.tsx` not found (test exit 0)
- No stale imports in source code (grep 0 results)

✅ **Build verification:**
- `pnpm --filter web build` passes successfully after cache clear
- No TypeScript errors
- Route manifest shows correct routes (no dashboard, no destinos/teste)

## Requirements Coverage

| Requirement | Task | Status |
| ----------- | ---- | ------ |
| NAV-02 | 2 | ✅ Complete (CAPI branding in title) |
| STYLE-05 | 3 | ✅ Complete (dashboard stub deleted) |
| AUDIT-02 | 3 | ✅ Complete (dead page removed) |
| AUDIT-03 | 2 | ✅ Complete (no "Serra da Capivara" references) |
| AUDIT-04 | 1 | ✅ Complete (font fallback syntax fixed) |
| AUDIT-05 | 1 | ✅ Complete (form element font-family inherit + 16px) |

## Deviations from Plan

None. Plan executed exactly as written. All three tasks completed with surgical, focused edits. No scope creep or unrelated changes.

## Key Decisions

1. **Font fallback fix:** Used nested `var(--font-display, Georgia, serif)` syntax instead of comma-separated to ensure Georgia is a true CSS variable fallback rather than a separate font-family value.

2. **Form element reset:** Applied globally to `input, textarea, select, button` with `font-size: 16px` mandatory for iOS Safari compatibility, avoiding component-level redundancy.

3. **Flash elimination:** Set `backgroundColor: var(--stone-50)` on both `<html>` and `<body>` elements to prevent white flash during stylesheet load (browser renders body background before CSS applies).

4. **Legacy cleanup:** Deleted both stub pages (dashboard) and test routes (destinos/teste) preemptively to prevent future confusion and reduce app surface area.

## Known Issues / Stubs

None. No hardcoded empty values, placeholders, or TODOs introduced.

## Threat Surface

No new endpoints or trust boundary crossings introduced. CSS variables are design-time only; metadata is static public copy. No security surface expanded.

## Self-Check: PASSED

- ✅ All files committed (0f5b658, 01e71b8, d1b7696)
- ✅ Verification commands pass (font-family, background colors, deletions confirmed)
- ✅ Build succeeds (`pnpm --filter web build`)
- ✅ No stale references to deleted routes
- ✅ SUMMARY.md created at `.planning/phases/11-frontend-polish/11-01-SUMMARY.md`
