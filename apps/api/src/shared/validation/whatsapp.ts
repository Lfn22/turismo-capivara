import { z } from 'zod'

// Telefone brasileiro com DDD (opcionalmente +55): só dígitos, espaços, parênteses, + e -
export const whatsappSchema = z
  .string()
  .trim()
  .regex(/^[\d\s()+-]+$/, { message: 'WhatsApp inválido' })
  .refine((v) => {
    const digits = v.replace(/\D/g, '').length
    return digits >= 10 && digits <= 13
  }, { message: 'WhatsApp inválido' })
