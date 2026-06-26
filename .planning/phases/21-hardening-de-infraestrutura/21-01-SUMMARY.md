---
phase: 21-hardening-de-infraestrutura
plan: "01"
subsystem: infra
tags: [dead-code, dependencies, gitignore, cleanup]
dependency_graph:
  requires: []
  provides: [clean-dependency-graph, out-gitignored]
  affects: [apps/api/package.json, pnpm-lock.yaml, .gitignore]
tech_stack:
  added: []
  patterns: [git-rm-cached-for-untrack]
key_files:
  modified:
    - apps/api/package.json
    - pnpm-lock.yaml
    - .gitignore
  deleted:
    - fix-plan06.js
    - out/ (55 build artifact files untracked from git index)
decisions:
  - ".worktrees/ kept: two active worktrees detected (capi-mvp-melhorias, refactor/security-hardening) — cannot remove"
  - "out/ files untracked via git rm --cached, not deleted from filesystem (Next.js build outputs)"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-26"
  tasks_completed: 2
  files_changed: 59
---

# Phase 21 Plan 01: Remove Dead Artifacts Summary

**One-liner:** Removed unused ioredis dependency, deleted fix-plan06.js migration script, and untracked 55 out/ build artifacts from git index.

## Tasks Completed

- **Task 1: Verificar worktrees e remover ioredis + fix-plan06.js**
  - `git worktree list` revealed 2 active worktrees: `.worktrees/capi-mvp-melhorias` and `.worktrees/refactor-hardening` — .worktrees/ directory kept, annotated below
  - Removed `"ioredis": "^5.10.1"` from `apps/api/package.json` line 37
  - Confirmed zero ioredis imports in `apps/api/src/` (grep returned empty)
  - Deleted `fix-plan06.js` via `git rm`
  - Ran `pnpm install` — completed in 6.1s, lockfile regenerated without ioredis

- **Task 2: Remover out/ do git index e adicionar ao .gitignore**
  - Ran `git rm -r --cached out/` — removed 55 tracked build artifact files from git index
  - Added `out/` line to `.gitignore` in the build outputs section (after `.turbo`)
  - Verified `git ls-files out/ | wc -l` returns 0

## Commits Made

- `097a378`: `chore(21-01): remove dead artifacts — ioredis, fix-plan06.js, out/`

## Must-Have Verification

- `grep "ioredis" apps/api/package.json` → empty (exit 1) — OK
- `test -f fix-plan06.js` → exit 1 (file does not exist) — OK
- `git ls-files out/` → 0 files — OK
- `grep "^out/$" .gitignore` → match — OK
- `pnpm install` → Done in 6.1s, no errors — OK
- `.worktrees/` verified: 2 active worktrees present, directory kept as required — OK

## Issues Encountered

**.worktrees/ not removed:** `git worktree list` shows two active worktrees:
- `C:/projetos/turismo-capivara/.worktrees/capi-mvp-melhorias` at `638fcb8 [feature/capi-mvp-melhorias]`
- `C:/projetos/turismo-capivara/.worktrees/refactor-hardening` at `a1acf59 [refactor/security-hardening]`

Per threat model T-21-01-01 and plan instructions, removal was aborted. These worktrees must be pruned manually once the branches are merged or abandoned.

## Deviations from Plan

None — plan executed exactly as written. .worktrees/ preservation was the documented fallback behavior, not a deviation.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- `apps/api/package.json` exists and contains no ioredis
- `fix-plan06.js` does not exist
- `git ls-files out/` returns 0
- `.gitignore` contains `out/`
- Commit `097a378` exists in git log
