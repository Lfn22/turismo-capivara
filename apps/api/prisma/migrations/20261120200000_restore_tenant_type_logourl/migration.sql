-- AlterTable (idempotent — columns may already exist from a prior migration)
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "type" "TenantType",
ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
