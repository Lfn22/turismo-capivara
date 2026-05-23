-- CreateEnum
CREATE TYPE "TenantApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "approvalStatus" "TenantApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "rejectionReason" TEXT;
