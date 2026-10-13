-- Sync migration: aligns migration history with DB state (changes applied via db push)

-- CreateTable
CREATE TABLE "PackageGuide" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "touristName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "guideProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- AlterTable DepartureSlot: add guideId
ALTER TABLE "DepartureSlot" ADD COLUMN "guideId" TEXT;

-- AlterTable TourPackage: add duration range and buffer
ALTER TABLE "TourPackage" ADD COLUMN "durationMinHours" INTEGER,
ADD COLUMN "durationMaxHours" INTEGER,
ADD COLUMN "bufferMinutes" INTEGER NOT NULL DEFAULT 60;

-- AlterTable ApiKey: change actorType from TEXT to AuditActorType enum
ALTER TABLE "ApiKey" DROP COLUMN "actorType",
ADD COLUMN "actorType" "AuditActorType" NOT NULL;

-- AlterTable Booking: add cancelTokenExpiresAt
ALTER TABLE "Booking" ADD COLUMN "cancelTokenExpiresAt" TIMESTAMP(3);

-- AlterTable User: change unique from email-only to tenant-scoped
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key";
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex Tenant: index on destinationId
CREATE INDEX "Tenant_destinationId_idx" ON "Tenant"("destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "PackageGuide_packageId_guideId_key" ON "PackageGuide"("packageId", "guideId");

-- CreateIndex
CREATE INDEX "PackageGuide_packageId_idx" ON "PackageGuide"("packageId");

-- CreateIndex
CREATE INDEX "PackageGuide_guideId_idx" ON "PackageGuide"("guideId");

-- CreateIndex
CREATE INDEX "DepartureSlot_guideId_startsAt_idx" ON "DepartureSlot"("guideId", "startsAt");

-- Recreate ApiKey actorType index (dropped when column was recreated above)
DROP INDEX IF EXISTS "ApiKey_actorType_idx";
CREATE INDEX "ApiKey_actorType_idx" ON "ApiKey"("actorType");

-- AddForeignKey
ALTER TABLE "PackageGuide" ADD CONSTRAINT "PackageGuide_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TourPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageGuide" ADD CONSTRAINT "PackageGuide_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "GuideProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_guideProfileId_fkey" FOREIGN KEY ("guideProfileId") REFERENCES "GuideProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartureSlot" ADD CONSTRAINT "DepartureSlot_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "GuideProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDestination" ADD CONSTRAINT "TenantDestination_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
