-- Foto de perfil para todos os usuários (guias continuam usando GuideProfile.photoUrl)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;

-- Logo da agência/associação
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

-- Auditoria de edições de guias feitas pela equipe da plataforma
ALTER TYPE "AuditTargetType" ADD VALUE IF NOT EXISTS 'USER';

-- Troca de e-mail com verificação por código
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingEmail" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailChangeCodeHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailChangeExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailChangeAttempts" INTEGER NOT NULL DEFAULT 0;

-- Refresh token: marca revogação por rotação (janela de tolerância para requisições concorrentes)
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "replacedAt" TIMESTAMP(3);
