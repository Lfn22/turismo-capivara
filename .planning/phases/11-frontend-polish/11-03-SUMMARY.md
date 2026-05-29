---
phase: 11-frontend-polish
plan: 03
subsystem: frontend-component-integration
tags: [server-actions, email-delivery, style-tokens, hex-cleanup]
duration_minutes: 18
completed_date: 2026-05-29T22:51:00Z
one_liner: Waitlist Server Action with Resend integration + ConversionAnchor real wiring + hex-to-token cleanup in form components
---

# Phase 11 Plan 03: Waitlist & Style Cleanup Summary

## Objective

Wave 0 setup (Resend install + actions dir creation) + waitlist Server Action + ConversionAnchor real integration + StickyDestinationNav hex cleanup. Removes the fake setTimeout from the waitlist form and wires it to real Resend email delivery. Cleans the BEM components of remaining hex literals.

## Completed Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Wave 0 setup + create waitlist Server Action | c4dd4aa | apps/web/app/actions/waitlist.ts, apps/web/package.json, pnpm-lock.yaml |
| 2 | ConversionAnchor — wire Server Action + hex cleanup | 84ab19b | apps/web/src/components/ui/ConversionAnchor.tsx |
| 3 | StickyDestinationNav hex cleanup | 9fa6c2c | apps/web/src/components/layout/StickyDestinationNav.tsx |

## Artifacts Created/Modified

### apps/web/app/actions/waitlist.ts (NEW)

**Server Action for waitlist email dispatch via Resend.**

- `'use server'` directive enforces server-side execution
- Validates email format: `email.includes('@')` prevents obviously invalid input (T-11-05 mitigation)
- Resend API guard: If `RESEND_API_KEY` not set, logs warning and returns `{ ok: true }` (graceful degradation for local dev)
- Sends two emails in parallel via `Promise.all()`:
  - **User confirmation:** "Você está na lista de espera do CAPI" (Portuguese per UI-SPEC contract)
  - **Admin notification:** Conditional on `WAITLIST_NOTIFY_EMAIL` env var (optional)
- Error handling: Catches send failures, returns error message per UI-SPEC: "Não conseguimos registrar seu email. Tente novamente."
- No rate limiting in this phase (T-11-06 accepted per threat register)

### apps/web/src/components/ui/ConversionAnchor.tsx

**Waitlist form wired to real Server Action; formError state for error handling; all hex literals replaced with tokens.**

- **Import Server Action:** `import { submitWaitlist } from '@/app/actions/waitlist'}`
- **formError state:** New state variable to display validation/delivery errors
- **handleSubmit rewrite:**
  - Removed fake `setTimeout(r, 800)`
  - Calls `await submitWaitlist(email)` — awaits actual email delivery
  - On success: sets `submitted = true` (shows confirmation state)
  - On error: displays `formError` message via aria-live region
- **Error display:** New `<p aria-live="polite">` after form with inline styles using CSS tokens (no hex)
- **Hex cleanup (D-06):**
  - `.conv-anchor__form { background: #fff }` → `background: var(--stone-50)`
  - `.conv-anchor__submit { color: #fff }` → `color: var(--stone-50)`
  - `.conv-anchor__confirmed-icon { color: #fff }` → `color: var(--stone-50)`
- All rgba() opacity values preserved (no token replacement needed)

### apps/web/src/components/layout/StickyDestinationNav.tsx

**Single hex literal replaced with token; all rgba() variants preserved.**

- **Hex cleanup (STYLE-03, D-06):** `.snav__back:hover { color: #fff }` → `color: var(--stone-50)`
- **Preserved:** 4 rgba() opacity variants remain unchanged:
  - `rgba(255, 255, 255, 0.65)` — back link color (no token)
  - `rgba(255, 255, 255, 0.18)` — separator background (no token)
  - `rgba(255, 255, 255, 0.9)` — name color (no token)
  - `rgba(255, 255, 255, 0.06)` — border color (no token)

### apps/web/package.json

**Resend package added:**
- `"resend": "^6.12.3"` installed via `pnpm add resend --filter web`
- Enables Server Actions to send emails via Resend API

## Verification Results

✅ **Task 1 verification:**
- `test -f apps/web/app/actions/waitlist.ts` exits 0
- `grep "'use server'" apps/web/app/actions/waitlist.ts` returns 1 line (first line)
- `grep "submitWaitlist" apps/web/app/actions/waitlist.ts` returns 1 line (export)
- `grep "RESEND_API_KEY" apps/web/app/actions/waitlist.ts` returns 3 lines (guard pattern)
- `grep "resend" apps/web/package.json` returns 1 line (package installed)
- `grep "setTimeout" apps/web/app/actions/waitlist.ts` returns 0 lines

✅ **Task 2 verification:**
- `grep "setTimeout" apps/web/src/components/ui/ConversionAnchor.tsx` returns 0 lines
- `grep "submitWaitlist" apps/web/src/components/ui/ConversionAnchor.tsx` returns 2 lines (import + call)
- `grep "formError" apps/web/src/components/ui/ConversionAnchor.tsx` returns 3 lines (state + check + display)
- `grep "#[0-9a-fA-F]{3,6}" apps/web/src/components/ui/ConversionAnchor.tsx` returns 0 lines
- `grep "var(--stone-50)" apps/web/src/components/ui/ConversionAnchor.tsx` returns 3 lines
- `grep "aria-live" apps/web/src/components/ui/ConversionAnchor.tsx` returns 1 line

✅ **Task 3 verification:**
- `grep "#[0-9a-fA-F]{3,6}" apps/web/src/components/layout/StickyDestinationNav.tsx` returns 0 lines
- `grep -c "rgba(" apps/web/src/components/layout/StickyDestinationNav.tsx` returns 4 (unchanged)

✅ **Build verification:**
- `pnpm --filter web build` exits 0 successfully
- No TypeScript errors
- No styling or component errors

## Requirements Coverage

| Requirement | Task | Status |
| ----------- | ---- | ------ |
| AUDIT-01 | 1 | ✅ Complete (Server Action has 'use server' directive + Resend guard pattern) |
| STYLE-03 | 3 | ✅ Complete (StickyDestinationNav hex cleaned) |

## Deviations from Plan

None. Plan executed exactly as written. All three tasks completed with focused edits to specific files. No scope creep or unrelated changes.

## Key Decisions

1. **Email validation:** Basic `email.includes('@')` check in Server Action (lightweight, rejects obvious spam) rather than regex or RFC 5322. Resend backend performs stricter validation.
2. **Graceful degradation:** When `RESEND_API_KEY` absent, Server Action logs warning and returns success (`{ ok: true }`) to avoid blocking local development.
3. **Error display:** aria-live region for error messages ensures screen reader announcement without page reload.
4. **Token consistency:** All hex colors replaced with `var(--stone-50)` per project CSS token registry. No rgba() variants replaced (no tokens exist).

## Threat Model Mitigations Applied

| Threat ID | Mitigation | Implementation |
| --------- | ---------- | --------------- |
| T-11-05 (Spoofing) | Email validation | `email.includes('@')` in submitWaitlist |
| T-11-07 (Information Disclosure) | API key protection | RESEND_API_KEY read from `process.env` server-side only, never exposed to client |
| T-11-08 (Tampering) | Admin email control | WAITLIST_NOTIFY_EMAIL sourced from env var, no user input |

## Self-Check: PASSED

- ✅ `test -f apps/web/app/actions/waitlist.ts` — file exists
- ✅ `git log --oneline | grep -q "c4dd4aa"` — Task 1 commit found
- ✅ `git log --oneline | grep -q "84ab19b"` — Task 2 commit found
- ✅ `git log --oneline | grep -q "9fa6c2c"` — Task 3 commit found
- ✅ `pnpm --filter web build` exits 0
- ✅ Zero hex values in ConversionAnchor.tsx
- ✅ Zero hex values in StickyDestinationNav.tsx
- ✅ All forms submit via real Server Action (no setTimeout)
