import { z } from 'zod'
import { getR2PublicUrl } from '../config/r2'

/**
 * URL de imagem aceita em fotos/logos: https e, quando R2_PUBLIC_URL está configurada,
 * hospedada no host público do R2 (ou seja, enviada pelo upload da plataforma).
 * Sem R2_PUBLIC_URL (dev/testes) aceita qualquer URL https.
 */
export function isAllowedImageUrl(value: string): boolean {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  if (!process.env.R2_PUBLIC_URL) return true
  return url.host === new URL(getR2PublicUrl()).host
}

export const imageUrlSchema = z
  .string()
  .max(2048, { message: 'URL deve ter no máximo 2048 caracteres' })
  .url({ message: 'URL inválida' })
  .refine(isAllowedImageUrl, { message: 'Imagem deve ser enviada pelo upload da plataforma (URL https)' })
