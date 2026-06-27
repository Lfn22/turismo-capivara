import { z } from 'zod'

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export const CreateDestinationInput = z.object({
  name: z
    .string()
    .min(3, { message: 'Nome deve ter entre 3 e 100 caracteres' })
    .max(100, { message: 'Nome deve ter entre 3 e 100 caracteres' }),
  description: z
    .string()
    .min(10, { message: 'Descrição deve ter entre 10 e 1000 caracteres' })
    .max(1000, { message: 'Descrição deve ter entre 10 e 1000 caracteres' }),
  state: z.enum(BR_STATES, { error: 'Estado inválido' }),
  photos: z
    .array(z.string().url({ message: 'URL de foto inválida' }))
    .max(5, { message: 'Máximo de 5 fotos' })
    .default([]),
  highlights: z
    .array(
      z
        .string()
        .min(5, { message: 'Destaque deve ter entre 5 e 200 caracteres' })
        .max(200, { message: 'Destaque deve ter entre 5 e 200 caracteres' }),
    )
    .max(10, { message: 'Máximo de 10 destaques' })
    .default([]),
})

export type CreateDestinationInputType = z.infer<typeof CreateDestinationInput>

export const UpdateDestinationInput = z
  .object({
    name: z
      .string()
      .min(3, { message: 'Nome deve ter entre 3 e 100 caracteres' })
      .max(100, { message: 'Nome deve ter entre 3 e 100 caracteres' })
      .optional(),
    description: z
      .string()
      .min(10, { message: 'Descrição deve ter entre 10 e 1000 caracteres' })
      .max(1000, { message: 'Descrição deve ter entre 10 e 1000 caracteres' })
      .optional(),
    state: z.enum(BR_STATES, { error: 'Estado inválido' }).optional(),
    photos: z
      .array(z.string().url({ message: 'URL de foto inválida' }))
      .max(5, { message: 'Máximo de 5 fotos' })
      .optional(),
    highlights: z
      .array(
        z
          .string()
          .min(5, { message: 'Destaque deve ter entre 5 e 200 caracteres' })
          .max(200, { message: 'Destaque deve ter entre 5 e 200 caracteres' }),
      )
      .max(10, { message: 'Máximo de 10 destaques' })
      .optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'Pelo menos um campo deve ser informado',
  })

export type UpdateDestinationInputType = z.infer<typeof UpdateDestinationInput>

export const ApprovalUpdateInput = z.object({
  approvalStatus: z.enum(['APPROVED', 'REJECTED'], { error: 'Status de aprovação inválido' }),
  rejectionReason: z.string().max(500).optional(),
})

export type ApprovalUpdateInputType = z.infer<typeof ApprovalUpdateInput>
