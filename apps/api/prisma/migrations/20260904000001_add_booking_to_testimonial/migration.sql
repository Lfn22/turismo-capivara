-- A-3: liga cada depoimento à reserva que o justifica.
--
-- Antes desta migração, POST /guides/:id/testimonials era público e sem vínculo com
-- reserva: qualquer pessoa publicava avaliações com nome arbitrário para qualquer guia.
--
-- Nullable de propósito: as linhas já existentes não têm reserva de origem e são
-- preservadas. O índice único garante, daqui em diante, um depoimento por reserva.
ALTER TABLE "Testimonial" ADD COLUMN "bookingId" TEXT;

CREATE UNIQUE INDEX "Testimonial_bookingId_key" ON "Testimonial"("bookingId");

ALTER TABLE "Testimonial"
  ADD CONSTRAINT "Testimonial_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Consulta quente da vitrine pública do guia (GET /guides/:id/testimonials)
CREATE INDEX "Testimonial_guideProfileId_idx" ON "Testimonial"("guideProfileId");
