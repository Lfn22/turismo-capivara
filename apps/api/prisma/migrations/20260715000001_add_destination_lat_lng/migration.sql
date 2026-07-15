-- AlterTable: add lat/lng coordinates to Destination for map widget
ALTER TABLE "Destination" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION;
ALTER TABLE "Destination" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;
