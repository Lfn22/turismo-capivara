import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter ao menos 32 caracteres'),
  MP_ACCESS_TOKEN: z.string().min(1),
  MP_WEBHOOK_SECRET: z.string().min(1),
  CPF_SECRET: z.string().min(1),
  // Optional with defaults — won't block startup
  CORS_ORIGIN: z.string().optional(),
  WEB_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BOOKING_EXPIRY_MINUTES: z.coerce.number().int().positive().default(30),
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
