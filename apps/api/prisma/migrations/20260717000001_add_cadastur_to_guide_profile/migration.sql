-- Add cadastur field to GuideProfile for independent guide registration
ALTER TABLE "GuideProfile" ADD COLUMN IF NOT EXISTS "cadastur" TEXT;
