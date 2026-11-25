/**
 * Cabeçalhos para chamadas servidor-a-servidor (Next → API) feitas em nome de um
 * visitante. Sem eles, a API vê só o IP do servidor Next e todos os turistas
 * dividem o mesmo balde de rate limit. A API só aceita `x-client-ip` com o segredo
 * compartilhado (INTERNAL_PROXY_SECRET, igual nos dois serviços).
 *
 * O IP do cliente é o ÚLTIMO item do X-Forwarded-For: é o que a borda do Railway
 * acrescenta; os anteriores vêm do próprio cliente e podem ser forjados.
 */
export function internalProxyHeaders(incoming: Headers): Record<string, string> {
  const secret = process.env.INTERNAL_PROXY_SECRET
  if (!secret) return {}
  const ip = incoming
    .get('x-forwarded-for')
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .pop()
  return { 'x-internal-proxy-secret': secret, ...(ip ? { 'x-client-ip': ip } : {}) }
}
