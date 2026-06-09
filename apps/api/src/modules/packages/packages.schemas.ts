import { z } from 'zod'

export const UpdatePackagePhotosInput = z.object({
  photos: z
    .array(z.string().url({ message: 'URL de foto inválida' }))
    .max(5, { message: 'Máximo 5 fotos permitidas' })
    .default([]),
})
export type UpdatePackagePhotosInput = z.infer<typeof UpdatePackagePhotosInput>

export const UpdatePackageHighlightsInput = z.object({
  highlights: z
    .array(
      z
        .string()
        .min(5, { message: 'Destaque deve ter pelo menos 5 caracteres' })
        .max(200, { message: 'Destaque deve ter no máximo 200 caracteres' }),
    )
    .max(10, { message: 'Máximo 10 destaques permitidos' })
    .default([]),
})
export type UpdatePackageHighlightsInput = z.infer<typeof UpdatePackageHighlightsInput>
