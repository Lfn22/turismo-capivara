-- Preço por grupo: TourPackage.price passa a ser o valor do grupo (1 guia, até 8 pessoas).
ALTER TABLE "TourPackage" ADD COLUMN "extraGuidePrice" DECIMAL(10,2);
ALTER TABLE "DepartureSlot" ADD COLUMN "maxGuides" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Booking" ADD COLUMN "guides" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Booking" ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN "amount" DECIMAL(10,2);

-- Horários ainda sem reservas passam ao modelo de 1 guia / 8 pessoas.
UPDATE "DepartureSlot" SET capacity = 8, "maxGuides" = 1 WHERE booked = 0;
UPDATE "TourPackage" SET capacity = 8;
