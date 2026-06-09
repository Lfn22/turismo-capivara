-- Data migration: approve destinations created before approval workflow was introduced
-- All destinations that were PENDING before Phase 14 were pre-existing content, not user submissions.
-- Set them to APPROVED so they appear on the public marketplace.
UPDATE "Destination"
SET "approvalStatus" = 'APPROVED'
WHERE "approvalStatus" = 'PENDING'
  AND "createdAt" < '2026-06-08 17:00:00+00';
