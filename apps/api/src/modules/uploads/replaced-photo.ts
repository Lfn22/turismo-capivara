import type { FastifyBaseLogger } from 'fastify'
import prisma from '../../database'
import { getR2PublicUrl } from '../../shared/config/r2'
import { deletePhotoFromR2 } from './uploads.service'

// Só pastas de foto de perfil/logo — fotos de destinos/pacotes nunca são apagadas aqui
const DELETABLE_FOLDERS = ['avatars', 'logos', 'guides']

/** Extrai a chave do objeto se a URL for do bucket público do R2; senão null. */
export function r2KeyFromUrl(url: string): string | null {
  if (!process.env.R2_PUBLIC_URL) return null
  const base = `${getR2PublicUrl()}/`
  if (!url.startsWith(base)) return null
  const key = url.slice(base.length)
  if (!/^[\w.\/-]+$/.test(key) || key.includes('..')) return null
  return key
}

/**
 * Best-effort: remove do R2 a foto/logo substituída ou removida.
 * Não apaga se a URL ainda for referenciada por outro registro. Nunca lança.
 */
export async function deleteReplacedPhoto(
  oldUrl: string | null | undefined,
  newUrl: string | null | undefined,
  log: FastifyBaseLogger,
): Promise<void> {
  if (!oldUrl || oldUrl === newUrl) return
  const key = r2KeyFromUrl(oldUrl)
  if (!key || !DELETABLE_FOLDERS.includes(key.split('/')[0])) return

  try {
    const [users, guides, tenants] = await Promise.all([
      prisma.user.count({ where: { photoUrl: oldUrl } }),
      prisma.guideProfile.count({ where: { OR: [{ photoUrl: oldUrl }, { portfolioPhotos: { has: oldUrl } }] } }),
      prisma.tenant.count({ where: { logoUrl: oldUrl } }),
    ])
    if (users + guides + tenants > 0) return
    await deletePhotoFromR2(key)
  } catch (err) {
    log.warn({ err, key }, '[R2] falha ao remover imagem antiga')
  }
}
