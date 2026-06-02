---
plan: 12-03
phase: 12-login-global
status: complete
---

# Plan 12-03: Frontend Login Global

## What was built

Two-step global login page at `/login` (email lookup via `lookupTenant` → `signIn` with resolved tenantSlug), password reset page at `/reset-password` (token+userId from URL, calls `resetPassword` API), "Painel" button added to `PublicNav` linking to `/login`, and `lib/auth-client.ts` with three client-side API helpers calling the Fastify backend directly.

## Files created/modified

- `apps/web/app/login/page.tsx` — replaced super-admin-only login with two-step global flow: Step 1 email lookup, Step 2 password with tenant name + "Não é você?" + "Esqueceu a senha?" links
- `apps/web/app/reset-password/page.tsx` — new page: reads token+userId from URL, validates, shows new password form, calls resetPassword, shows success state with link to /login
- `apps/web/src/components/layout/PublicNav.tsx` — added always-visible "Painel" button (ochre bg, /login href) to right side of nav
- `apps/web/lib/auth-client.ts` — new file: lookupTenant, requestPasswordReset, resetPassword helpers calling Fastify API at NEXT_PUBLIC_API_URL

## Deviations from Plan

**Path correction (Rule 3 — Blocking)**
- Plan specified paths under `apps/web/src/app/(public)/` but actual app directory is `apps/web/app/` (no `src/`, no `(public)` route group at global level)
- Files placed at correct actual paths: `apps/web/app/login/page.tsx`, `apps/web/app/reset-password/page.tsx`, `apps/web/lib/auth-client.ts`

**auth-client.ts calls API directly (not via Next.js proxy)**
- Plan suggested calling `/api/auth/lookup-tenant` etc. but those Next.js proxy routes don't exist
- These are unauthenticated public endpoints (lookup, request-reset, reset-password) — calling `NEXT_PUBLIC_API_URL` directly is correct and simpler; no auth token needed

**`/login` existing file replaced**
- Existing `/login/page.tsx` was a super-admin-only login (hardcoded `tenantSlug: "capi-platform"`)
- Replaced with global two-step flow; super-admin now uses same flow (email resolves to capi-platform tenant)

## Self-Check

- [x] /login page shows email input (Step 1)
- [x] Step 2 shows tenant name + password input
- [x] 'Não é você?' returns to Step 1
- [x] 'Cadastrar agência ou guia' link → /onboarding
- [x] PublicNav has 'Painel' → /login
- [x] /reset-password page handles token + userId from URL
- [x] auth-client.ts has lookupTenant, requestPasswordReset, resetPassword
- [x] pnpm --filter web build passes (all routes compiled, no TS errors)

## Post-Checkpoint Fixes

**fix(12-03) — auth-client response shape** (`3c2feb5`)
- `lookupTenant` was reading `data.tenantSlug` but API returns `data.tenant.tenantSlug` (nested)
- Fixed to `data.tenant?.tenantSlug` / `data.tenant.tenantName`

**feat(12-03) — /login/esqueci-a-senha page** (`6a55719`)
- Link "Esqueceu a senha?" in login page pointed to `/login/esqueci-a-senha` (404)
- Created `apps/web/app/login/esqueci-a-senha/page.tsx`: email input → calls `requestPasswordReset` → generic success message (no enumeration)

## User Verification: PASSED

Login flow manually verified by user: email lookup (Step 1), tenant name display + password (Step 2), redirect on success. "Esqueceu a senha?" flow confirmed working.
