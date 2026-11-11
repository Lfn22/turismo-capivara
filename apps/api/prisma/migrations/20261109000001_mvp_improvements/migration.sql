-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED');

-- AlterTable: add code field to Booking
ALTER TABLE "Booking" ADD COLUMN "code" TEXT;

-- Backfill: set code = last 6 chars of id for existing bookings
UPDATE "Booking" SET "code" = LOWER(RIGHT("id", 6)) WHERE "code" IS NULL;

-- AlterTable: change Tenant.approvalStatus from TenantApprovalStatus to ApprovalStatus
ALTER TABLE "Tenant" DROP COLUMN "approvalStatus";
ALTER TABLE "Tenant" ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE IF EXISTS "TenantApprovalStatus";

-- CreateTable: Payout (marketplace fee tracking)
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "platformFee" DECIMAL(10,2) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Booking indexes for performance
CREATE UNIQUE INDEX "Booking_code_key" ON "Booking"("code");
CREATE INDEX "Booking_tenantId_status_idx" ON "Booking"("tenantId", "status");
CREATE INDEX "Booking_status_expiresAt_idx" ON "Booking"("status", "expiresAt");

-- CreateIndex: TourPackage marketplace listing
CREATE INDEX "TourPackage_tenantId_active_idx" ON "TourPackage"("tenantId", "active");

-- CreateIndex: Payout queries
CREATE INDEX "Payout_tenantId_status_idx" ON "Payout"("tenantId", "status");
CREATE INDEX "Payout_guideId_status_idx" ON "Payout"("guideId", "status");

-- AddForeignKey: Payout relations
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "GuideProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
