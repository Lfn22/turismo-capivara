---
plan: "02-03"
phase: "02-user-access-guide-onboarding"
status: complete
completed: "2026-04-28"
requirements_addressed:
  - AUTH-03
gap_closure: true
---

# 02-03 Summary — Security Fixes (CR-01, CR-02, CR-03)

## What Was Built

Closed three critical security issues found in the Phase 2 code review:

- **CR-03:** `approvalStatus` added to JWT payload in login handler — CONDUTOR can log in at any approvalStatus; enforcement is downstream per CONTEXT.md locked decision.
- **CR-01:** CPF hashed with HMAC-SHA256 using `hashCpf()` function (Node.js built-in `crypto`) — CPF never stored in plaintext, satisfying LGPD requirement.
- **CR-02:** `@unique` constraint added to `User.cpf` in schema + P2002 error handler updated to distinguish email vs CPF duplicate errors.

## Key Decisions

- CONDUTOR login is **not blocked** by `approvalStatus` — this matches CONTEXT.md line 35. The `approvalStatus` field in the JWT token is what downstream route guards use.
- HMAC-SHA256 is deterministic (same CPF + same secret → same hash), which makes the `@unique` constraint work correctly for deduplication.
- Multiple NULLs are allowed in PostgreSQL unique indexes, so CLIENTEs without CPF are unaffected by the new constraint.
- Migration generated as `--create-only` (no live database available locally); will be applied automatically by Railway on deploy.

## Files Modified

- `apps/api/src/modules/auth/auth.routes.ts` — added `createHmac` import, `hashCpf()` function, `approvalStatus` in jwtSign payload, CPF hashing in CONDUTOR register, P2002 CPF error message
- `apps/api/prisma/schema.prisma` — `cpf String? @unique` + restored datasource `url` field
- `apps/api/.env.example` — documented `CPF_SECRET` as required env var
- `apps/api/prisma/migrations/20260428_hash_cpf_unique/migration.sql` — `CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf")`

## Commits

- `ccd107b` — feat(02-03): add approvalStatus to JWT payload (CR-03)
- `7f8e454` — feat(02-03): hash CPF with HMAC-SHA256 + @unique constraint + migration (CR-01, CR-02)

## Self-Check: PASSED

- ✅ `approvalStatus: user.approvalStatus` in jwtSign payload
- ✅ No login block for PENDING CONDUTORs
- ✅ `createHmac('sha256', secret).update(cpf).digest('hex')` in hashCpf
- ✅ `cpf: hashCpf(body.cpf)` in CONDUTOR register (not plaintext)
- ✅ P2002 handler distinguishes CPF vs email (fields?.includes('cpf'))
- ✅ `cpf String? @unique` in schema.prisma
- ✅ CPF_SECRET documented in .env.example
- ✅ Migration file exists with CREATE UNIQUE INDEX
- ✅ TypeScript compiles: `npx tsc --noEmit` → exit 0
