import { z } from 'zod'
import { isValidCPF } from '../../shared/utils/cpf'

export const selfServiceBodySchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  code: z.string().length(6, { message: 'Código deve ter 6 caracteres' }),
})

export type SelfServiceBody = z.infer<typeof selfServiceBodySchema>

export const cancelSelfBodySchema = z.object({
  token: z.string().min(1, { message: 'Token é obrigatório' }),
})

export type CancelSelfBody = z.infer<typeof cancelSelfBodySchema>

export const repayBodySchema = selfServiceBodySchema.extend({
  cpf: z
    .string()
    .regex(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos numéricos' })
    .refine(isValidCPF, { message: 'CPF inválido' }),
})

export type RepayBody = z.infer<typeof repayBodySchema>
