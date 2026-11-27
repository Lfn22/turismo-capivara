-- Pedidos de aprovação de alterações em roteiros feitas por guias (CONDUTOR).
CREATE TYPE "PackageRequestType" AS ENUM ('PUBLISH', 'UPDATE', 'UNPUBLISH', 'ARCHIVE');
CREATE TYPE "PackageRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "PackageChangeRequest" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "type" "PackageRequestType" NOT NULL,
    "changes" JSONB,
    "status" "PackageRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PackageChangeRequest_status_createdAt_idx" ON "PackageChangeRequest"("status", "createdAt");
CREATE INDEX "PackageChangeRequest_packageId_status_idx" ON "PackageChangeRequest"("packageId", "status");

ALTER TABLE "PackageChangeRequest" ADD CONSTRAINT "PackageChangeRequest_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TourPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PackageChangeRequest" ADD CONSTRAINT "PackageChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PackageChangeRequest" ADD CONSTRAINT "PackageChangeRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- No máximo um pedido PENDING por roteiro (a trava de linha no serviço evita a corrida; o índice garante)
CREATE UNIQUE INDEX "PackageChangeRequest_one_pending_per_package" ON "PackageChangeRequest"("packageId") WHERE "status" = 'PENDING';
