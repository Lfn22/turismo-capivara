-- AlterTable: add rejectionReason to Destination, Tenant, and User
ALTER TABLE "Destination" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
