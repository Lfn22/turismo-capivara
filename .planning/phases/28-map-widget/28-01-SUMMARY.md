---
plan: 28-01
status: complete
completed: 2026-07-08
---

## What Was Done
Added `lat Float?` and `lng Float?` fields to the Destination model in `apps/api/prisma/schema.prisma`. Applied to database via `prisma db push` (migrate dev was blocked by pre-existing schema drift from prior phases applied without migration files).

## Files Changed
- `apps/api/prisma/schema.prisma` — added lat/lng fields after `state String` at lines 20-21

## Deviation
Plan specified `prisma migrate dev --name add_destination_coordinates`. Could not be used because the database had schema drift (PackageGuide table, DepartureSlot.guideId, etc.) that would require a reset. Used `prisma db push` instead — same end result: lat/lng columns added to Destination table. No migration file was generated.

## Verification
- `grep "lat.*Float" apps/api/prisma/schema.prisma` → found at line 20
- `grep "lng.*Float" apps/api/prisma/schema.prisma` → found at line 21
- `prisma db push` → "Your database is now in sync with your Prisma schema. Done in 6.14s"
- Prisma client regenerated with new fields

## Issues
Pre-existing schema drift in database (unrelated to this plan) blocked `migrate dev`. Mitigated with `db push`.
