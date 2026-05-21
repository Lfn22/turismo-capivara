import { z } from 'zod'

export const selfServiceBodySchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  code: z.string().length(6, { message: 'Código deve ter 6 caracteres' }),
})

export type SelfServiceBody = z.infer<typeof selfServiceBodySchema>
