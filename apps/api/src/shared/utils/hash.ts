import { createHmac } from 'crypto'

export function hashCpf(cpf: string): string {
  const secret = process.env.CPF_SECRET
  if (!secret) throw new Error('CPF_SECRET environment variable is required')
  return createHmac('sha256', secret).update(cpf).digest('hex')
}
