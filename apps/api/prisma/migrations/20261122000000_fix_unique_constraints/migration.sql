-- DropIndex
DROP INDEX "Booking_code_key";

-- DropIndex
DROP INDEX "GuideAffiliation_guideId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Booking_tenantId_code_key" ON "Booking"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "GuideAffiliation_guideId_tenantId_key" ON "GuideAffiliation"("guideId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_bookingId_key" ON "Payout"("bookingId");
