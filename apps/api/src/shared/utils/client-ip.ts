import crypto from 'node:crypto'
import type { FastifyRequest } from 'fastify'

type Req = Pick<FastifyRequest, 'ip' | 'headers'>

function header(req: Req, name: string): string | undefined {
  const v = req.headers[name]
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

/** A requisição veio do servidor web (Next), autenticada pelo segredo compartilhado. */
function isInternal(req: Req): boolean {
  const secret = process.env.INTERNAL_PROXY_SECRET
  const given = header(req, 'x-internal-proxy-secret')
  if (!secret || !given) return false
  const a = Buffer.from(secret)
  const b = Buffer.from(given)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/**
 * IP do cliente final para rate limit e auditoria.
 *
 * A web chama a API servidor-a-servidor; sem isto, todos os turistas compartilham o
 * IP do servidor Next (e um único balde de rate limit). O `x-client-ip` só é aceito
 * com o segredo interno — de fora, não dá para forjar. Sem segredo: `request.ip`
 * (com `trustProxy` limitado aos saltos reais, o X-Forwarded-For forjado é ignorado).
 */
export function clientIp(req: Req): string {
  if (isInternal(req)) {
    const forwarded = header(req, 'x-client-ip')
    if (forwarded) return forwarded
  }
  return req.ip
}

/** Chamada interna sem cliente associado (ex.: render SSR) — fora do rate limit global. */
export function isInternalWithoutClient(req: Req): boolean {
  return isInternal(req) && !header(req, 'x-client-ip')
}

/** Quantos proxies à frente da API são confiáveis (Railway: 1 — a borda). */
export function trustProxyHops(): number {
  const n = Number(process.env.TRUST_PROXY_HOPS ?? 1)
  return Number.isInteger(n) && n >= 0 ? n : 1
}

/**
 * `trustProxy` como função (equivale ao número de saltos: confia nos `hops` mais
 * próximos). O Fastify 5.12 deixou de tipar `number` aqui; a função funciona em todas.
 */
export function trustProxyFn(hops = trustProxyHops()): (address: string, hop: number) => boolean {
  return (_address, hop) => hop < hops
}
