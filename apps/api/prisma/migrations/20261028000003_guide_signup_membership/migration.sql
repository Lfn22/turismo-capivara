-- CreateEnum
CREATE TYPE "TenantType" AS ENUM ('AGENCIA', 'ASSOCIACAO');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('ICMBIO', 'CADASTUR');

-- CreateEnum
CREATE TYPE "PackageGuideStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'LEFT');

-- CreateEnum
CREATE TYPE "AffiliationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "type" "TenantType" NOT NULL DEFAULT 'AGENCIA';

-- AlterTable
ALTER TABLE "GuideProfile"
ADD COLUMN     "credentialDocKey" TEXT,
ADD COLUMN     "credentialNumber" TEXT,
ADD COLUMN     "credentialSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "credentialType" "CredentialType";

-- AlterTable
ALTER TABLE "PackageGuide"
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" "PackageGuideStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PackageGuide" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "GuideDestination" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuideDestination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideAffiliation" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "AffiliationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideAffiliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuideDestination_destinationId_idx" ON "GuideDestination"("destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "GuideDestination_guideId_destinationId_key" ON "GuideDestination"("guideId", "destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "GuideAffiliation_guideId_key" ON "GuideAffiliation"("guideId");

-- CreateIndex
CREATE INDEX "GuideAffiliation_tenantId_status_idx" ON "GuideAffiliation"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "GuideDestination" ADD CONSTRAINT "GuideDestination_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "GuideProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideDestination" ADD CONSTRAINT "GuideDestination_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideAffiliation" ADD CONSTRAINT "GuideAffiliation_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "GuideProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideAffiliation" ADD CONSTRAINT "GuideAffiliation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill (antes de remover as colunas antigas)
UPDATE "PackageGuide" SET "status" = CASE WHEN "active" THEN 'ACCEPTED' ELSE 'LEFT' END::"PackageGuideStatus", "decidedAt" = "createdAt";

UPDATE "GuideProfile" SET "credentialType" = 'CADASTUR', "credentialNumber" = "cadastur", "credentialSubmittedAt" = "createdAt" WHERE "cadastur" IS NOT NULL;

INSERT INTO "GuideDestination" ("id","guideId","destinationId","createdAt") SELECT gen_random_uuid()::text, gp."id", t."destinationId", now() FROM "GuideProfile" gp JOIN "User" u ON u."id" = gp."userId" JOIN "Tenant" t ON t."id" = u."tenantId" WHERE t."destinationId" IS NOT NULL ON CONFLICT DO NOTHING;

-- DropColumn
ALTER TABLE "PackageGuide" DROP COLUMN "active";
ALTER TABLE "GuideProfile" DROP COLUMN "cadastur";
