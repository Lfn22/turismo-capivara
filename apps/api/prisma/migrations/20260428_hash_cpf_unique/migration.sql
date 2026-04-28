-- Migration: Add @unique index to User.cpf for LGPD HMAC-SHA256 uniqueness enforcement
-- AddUniqueIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");
