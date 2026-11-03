-- CreateEnum
CREATE TYPE "TenantDestinationStatus" AS ENUM ('PENDING', 'ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'SYSTEM', 'API_KEY');

-- CreateEnum
CREATE TYPE "AuditTargetType" AS ENUM ('TENANT', 'BOOKING', 'API_KEY', 'DESTINATION');

-- CreateTable
CREATE TABLE "TenantDestination" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "status" "TenantDestinationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDestination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" "AuditTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- AlterTable Tenant: add confirmation fields
ALTER TABLE "Tenant"
    ADD COLUMN "confirmationCode" TEXT,
    ADD COLUMN "confirmationCodeExpiresAt" TIMESTAMP(3),
    ADD COLUMN "confirmationAttempts" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- AlterTable TourPackage: add destinationId nullable FK
ALTER TABLE "TourPackage"
    ADD COLUMN "destinationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TenantDestination_tenantId_destinationId_key" ON "TenantDestination"("tenantId", "destinationId");

-- CreateIndex
CREATE INDEX "TenantDestination_tenantId_idx" ON "TenantDestination"("tenantId");

-- CreateIndex
CREATE INDEX "TenantDestination_destinationId_idx" ON "TenantDestination"("destinationId");

-- CreateIndex
CREATE INDEX "TenantDestination_status_idx" ON "TenantDestination"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_prefix_key" ON "ApiKey"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_prefix_idx" ON "ApiKey"("prefix");

-- CreateIndex
CREATE INDEX "ApiKey_actorType_idx" ON "ApiKey"("actorType");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorType_idx" ON "AuditLog"("actorType");

-- CreateIndex
CREATE INDEX "TourPackage_destinationId_idx" ON "TourPackage"("destinationId");

-- AddForeignKey
ALTER TABLE "TenantDestination" ADD CONSTRAINT "TenantDestination_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDestination" ADD CONSTRAINT "TenantDestination_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourPackage" ADD CONSTRAINT "TourPackage_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: Tenant.destinationId -> TenantDestination (per D-01, D-04)
-- Rows existentes recebem status ACTIVE (tenants já estavam vinculados)
INSERT INTO "TenantDestination" ("id", "tenantId", "destinationId", "status", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::TEXT,
  t."id",
  t."destinationId",
  'ACTIVE'::"TenantDestinationStatus",
  NOW(),
  NOW()
FROM "Tenant" t
WHERE t."destinationId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "TenantDestination" td
    WHERE td."tenantId" = t."id"
      AND td."destinationId" = t."destinationId"
  );
