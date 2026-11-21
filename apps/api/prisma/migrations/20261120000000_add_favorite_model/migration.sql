-- DropForeignKey
ALTER TABLE "GuideAffiliation" DROP CONSTRAINT "GuideAffiliation_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_tenantId_fkey";

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN IF EXISTS "logoUrl",
DROP COLUMN IF EXISTS "type";

-- AlterTable
ALTER TABLE "TourPackage" ADD COLUMN IF NOT EXISTS "meetingPointLat" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "meetingPointLng" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "meetingPointName" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT,
    "destinationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_userId_packageId_key" ON "Favorite"("userId", "packageId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_userId_destinationId_key" ON "Favorite"("userId", "destinationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId");

-- AddForeignKey
ALTER TABLE "GuideAffiliation" ADD CONSTRAINT "GuideAffiliation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TourPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
