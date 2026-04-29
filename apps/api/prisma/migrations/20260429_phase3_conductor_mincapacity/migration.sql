-- Phase 3: Add conductorId to TourPackage and minCapacity to DepartureSlot

-- AlterTable TourPackage: add conductorId (nullable)
ALTER TABLE "TourPackage" ADD COLUMN "conductorId" TEXT;

-- AlterTable DepartureSlot: add minCapacity with default 1
ALTER TABLE "DepartureSlot" ADD COLUMN "minCapacity" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey TourPackage.conductorId -> User.id
ALTER TABLE "TourPackage" ADD CONSTRAINT "TourPackage_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
