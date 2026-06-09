import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'

export async function updatePackagePhotos(
  packageId: string,
  userId: string,
  photos: string[],
) {
  const pkg = await prisma.tourPackage.findUnique({ where: { id: packageId } })

  if (!pkg) throw new AppError('Roteiro não encontrado', 404)
  if (pkg.conductorId !== userId) throw new AppError('Não autorizado', 403)
  if (photos.length > 5) throw new AppError('Máximo 5 fotos permitidas', 400)

  return prisma.tourPackage.update({
    where: { id: packageId },
    data: { photos },
  })
}

export async function updatePackageHighlights(
  packageId: string,
  userId: string,
  highlights: string[],
) {
  const pkg = await prisma.tourPackage.findUnique({ where: { id: packageId } })

  if (!pkg) throw new AppError('Roteiro não encontrado', 404)
  if (pkg.conductorId !== userId) throw new AppError('Não autorizado', 403)
  if (highlights.some((h) => h.length < 5))
    throw new AppError('Cada destaque deve ter pelo menos 5 caracteres', 400)
  if (highlights.length > 10) throw new AppError('Máximo 10 destaques permitidos', 400)

  return prisma.tourPackage.update({
    where: { id: packageId },
    data: { highlights },
  })
}
