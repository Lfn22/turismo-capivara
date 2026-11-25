import prisma from '../../database'

/**
 * GuideProfile.id avaliado numa reserva: o guia atribuído ao slot (DepartureSlot.guideId
 * já é um GuideProfile.id) ou, sem guia no slot, o perfil do condutor do roteiro
 * (TourPackage.conductorId é um User.id).
 */
export async function resolveReviewGuideProfileId(slot: {
  guideId: string | null
  package: { conductorId: string | null }
}): Promise<string | null> {
  if (slot.guideId) return slot.guideId
  if (!slot.package.conductorId) return null
  const profile = await prisma.guideProfile.findUnique({
    where: { userId: slot.package.conductorId },
    select: { id: true },
  })
  return profile?.id ?? null
}

export function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === 'P2002'
}
