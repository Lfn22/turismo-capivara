import { z } from 'zod'

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter ao menos 32 caracteres'),
    MP_ACCESS_TOKEN: z.string().min(1),
    MP_WEBHOOK_SECRET: z.string().min(1),
    CPF_SECRET: z.string().min(1),
    ANONYMIZATION_SALT: z.string().min(1),
    // Cloudflare R2
    CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
    CLOUDFLARE_API_TOKEN: z.string().min(1),
    R2_BUCKET_NAME: z.string().min(1),
    R2_PUBLIC_URL: z.string().min(1),
    // Email
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().min(1),
    // Optional with defaults — won't block startup in development
    CORS_ORIGIN: z.string().optional(),
    WEB_URL: z.string().optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    BOOKING_EXPIRY_MINUTES: z.coerce.number().int().positive().default(30),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') return
    if (!data.CORS_ORIGIN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CORS_ORIGIN é obrigatório em produção (senão a API rejeitará todas as requests do browser)',
        path: ['CORS_ORIGIN'],
      })
    }
  })

export function validateEnv(): void {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    console.error(`\n[STARTUP] FATAL — variáveis de ambiente inválidas ou ausentes:\n${details}\n`)
    process.exit(1)
  }
}
