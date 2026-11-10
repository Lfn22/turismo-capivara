import type { FastifyRequest } from 'fastify'

/**
 * Chave de rate limit por usuário autenticado.
 * O @fastify/rate-limit roda no onRequest (antes do authenticate), então o JWT é
 * verificado aqui; sem token válido, cai para o IP.
 */
export function userRateLimitKey(prefix: string) {
  return async (request: FastifyRequest): Promise<string> => {
    try {
      const payload = await request.jwtVerify<{ sub: string }>()
      return `${prefix}:user:${payload.sub}`
    } catch {
      return `${prefix}:ip:${request.ip}`
    }
  }
}

export function userRateLimit(prefix: string, max: number, timeWindow = '1 minute') {
  return { rateLimit: { max, timeWindow, keyGenerator: userRateLimitKey(prefix) } }
}
