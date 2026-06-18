-- AlterTable: add cancelToken as nullable first
ALTER TABLE "Booking" ADD COLUMN "cancelToken" TEXT;

-- Backfill: generate unique token for all existing bookings
UPDATE "Booking" SET "cancelToken" = gen_random_uuid()::text WHERE "cancelToken" IS NULL;

-- Make cancelToken NOT NULL after backfill
ALTER TABLE "Booking" ALTER COLUMN "cancelToken" SET NOT NULL;

-- CreateIndex: unique constraint on cancelToken
CREATE UNIQUE INDEX "Booking_cancelToken_key" ON "Booking"("cancelToken");

-- CreateTable: ProcessedWebhookEvent for idempotent webhook deduplication
CREATE TABLE "ProcessedWebhookEvent" (
    "id" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
);
