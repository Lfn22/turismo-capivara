-- Migration: Add customerCpfHash to Booking (LGPD — CPF armazenado como HMAC-SHA256)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "customerCpfHash" TEXT;
