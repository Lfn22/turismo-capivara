-- O guia responsável (TourPackage.conductorId) também precisa constar como guia aceito do roteiro.
-- Roteiros antigos e do seed tinham só o conductorId, então não apareciam em "Guias deste roteiro"
-- nem no perfil do guia. Só insere/aceita; não remove nada.
INSERT INTO "PackageGuide" ("id", "packageId", "guideId", "status", "decidedAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, tp."id", gp."id", 'ACCEPTED', now(), now(), now()
FROM "TourPackage" tp
JOIN "GuideProfile" gp ON gp."userId" = tp."conductorId"
WHERE tp."conductorId" IS NOT NULL
ON CONFLICT ("packageId", "guideId") DO UPDATE
SET "status" = 'ACCEPTED', "rejectionReason" = NULL, "decidedAt" = now(), "updatedAt" = now()
WHERE "PackageGuide"."status" <> 'ACCEPTED';
