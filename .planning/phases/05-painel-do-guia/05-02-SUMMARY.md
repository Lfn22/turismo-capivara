---
phase: 05-painel-do-guia
plan: "02"
subsystem: web-auth
tags: [next-auth, middleware, authentication, session, login]
dependency_graph:
  requires:
    - "05-01 (next-auth installed, .env.local provisioned)"
  provides:
    - NextAuth CredentialsProvider wired to API_URL/auth/login
    - Session augmented with role, tenantId, token fields
    - Middleware protecting /:slug/painel/* and /:slug/admin/* by role
    - Login page at /[slug]/login with tenant-aware signIn
    - SessionProvider available to all Client Components
  affects:
    - apps/web/lib/auth.ts
    - apps/web/types/next-auth.d.ts
    - apps/web/app/api/auth/[...nextauth]/route.ts
    - apps/web/middleware.ts
    - apps/web/app/[slug]/login/page.tsx
    - apps/web/app/providers.tsx
    - apps/web/app/layout.tsx
tech_stack:
  added: []
  patterns:
    - CredentialsProvider → fetch API_URL/auth/login → decode JWT payload → persist to session
    - withAuth middleware for role-based route protection
    - Providers wrapper pattern (Server Component layout + Client Component SessionProvider)
key_files:
  created:
    - apps/web/lib/auth.ts
    - apps/web/types/next-auth.d.ts
    - apps/web/app/api/auth/[...nextauth]/route.ts
    - apps/web/middleware.ts
    - apps/web/app/[slug]/login/page.tsx
    - apps/web/app/providers.tsx
  modified:
    - apps/web/app/layout.tsx
    - apps/web/app/roteiros/detalhe/page.tsx
decisions:
  - Providers wrapper pattern used (providers.tsx) to keep layout.tsx as Server Component while enabling SessionProvider for Client Components
  - conductorId flows from JWT.sub via session.user.token (never from form input)
  - signIn pages config set to /login (fallback) — actual tenant pages at /[slug]/login
metrics:
  duration: "~10 minutes"
  completed: "2026-05-07T17:54:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 8
---

# Phase 5 Plan 02: NextAuth Setup + Middleware + Login Page Summary

**One-liner:** NextAuth v4 CredentialsProvider configured to call Fastify API login, with JWT/session callbacks persisting role and token, middleware role guard for /painel and /admin routes, and a tenant-aware login page.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create lib/auth.ts, type augmentation, and route handler | 6da3c0f | lib/auth.ts, types/next-auth.d.ts, app/api/auth/[...nextauth]/route.ts |
| 2 | Create middleware.ts, login page, and SessionProvider | 3d8d7fc | middleware.ts, app/[slug]/login/page.tsx, app/providers.tsx, app/layout.tsx |

## What Was Built

**Task 1 — NextAuth core:**
- `lib/auth.ts`: CredentialsProvider fetches `API_URL/auth/login` server-side, decodes JWT payload (base64url), returns user with `role`, `tenantId`, `token`. JWT callback persists to `token.apiToken/role/tenantId`. Session callback exposes them as `session.user`.
- `types/next-auth.d.ts`: Augments `Session` with `id`, `role`, `tenantId`, `token` fields; augments `JWT` with `role`, `tenantId`, `apiToken`.
- `app/api/auth/[...nextauth]/route.ts`: App Router handler exporting `GET` and `POST`.

**Task 2 — Middleware + UI:**
- `middleware.ts`: `withAuth` protecting `/:slug/painel/*` (CONDUTOR only) and `/:slug/admin/*` (ADMIN only). Unauthenticated users redirected to `/:slug/login`; wrong-role redirected to `/:slug/login?error=forbidden`.
- `app/[slug]/login/page.tsx`: Client Component with email/password form, calls `signIn("credentials", { ..., tenantSlug: params.slug, redirect: false })`. On success pushes to `/${params.slug}/painel/dashboard`.
- `app/providers.tsx`: Client Component `Providers` wrapper with `SessionProvider`.
- `app/layout.tsx`: Imports and wraps `{children}` with `<Providers>` while remaining a Server Component.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing TS type error in roteiros/detalhe/page.tsx blocking build**
- **Found during:** Task 2 build verification
- **Issue:** `flexWrap: "wrap"` in `cardStyle` object inferred as `string`, not assignable to `FlexWrap | undefined` in `React.CSSProperties`.
- **Fix:** Added `as const` to `flexWrap: "wrap" as const`.
- **Files modified:** `apps/web/app/roteiros/detalhe/page.tsx`
- **Commit:** 3d8d7fc

## Known Stubs

None — login page fully wired to NextAuth signIn. Session data flows from API JWT.

## Threat Surface

Threats T-05-05 through T-05-08 from plan mitigated:
- CSRF: next-auth CSRF token embedded in all signIn calls
- Role elevation: `token?.role !== "CONDUTOR"` checks JWT-signed role, never client input
- NEXTAUTH_SECRET: server-only env var, not committed (.gitignored via apps/web/.gitignore)
- JWT tampering: next-auth signs cookie with NEXTAUTH_SECRET

## Self-Check: PASSED

All files exist. Both commits verified in git log.
