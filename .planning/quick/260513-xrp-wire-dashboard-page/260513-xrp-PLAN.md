---
quick_id: 260513-xrp
slug: wire-dashboard-page
description: Wire up apps/web/app/dashboard/ — commit untracked page, clean debug text
date: 2026-05-13
status: in_progress
---

# Quick Task 260513-xrp: Wire up dashboard page

## Goal

`apps/web/app/dashboard/page.tsx` is untracked. The file contains a debug message ("O erro 404 foi resolvido") that should not ship. Clean the text, then commit.

## Tasks

### Task 1: Clean dashboard/page.tsx and commit

**Files:** `apps/web/app/dashboard/page.tsx`

**Action:** Replace debug body text with a neutral placeholder. The real tenant dashboards live at `/[slug]/(painel)/painel/` — this root `/dashboard` route is a standalone page with no tenant context. Make it a clean redirect hint or neutral shell.

**Verify:** `git status` shows file tracked; no debug strings remain.

**Done:** File committed, no "404 foi resolvido" string in codebase.
