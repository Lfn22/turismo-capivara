-- AlterTable
ALTER TABLE "TourPackage" ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- Roteiros existentes já estavam visíveis: contam como publicados na criação
UPDATE "TourPackage" SET "publishedAt" = "createdAt";
