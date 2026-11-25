/**
 * Envolve o fetch do servidor Next: chamadas para a API recebem o segredo interno.
 * Sem isto, o render SSR de TODOS os visitantes saía do mesmo IP e dividia o rate
 * limit global da API (100/min) — sob tráfego, o site inteiro recebia 429.
 * A API isenta chamadas internas sem cliente (ver apps/api/src/shared/utils/client-ip.ts).
 * Cabeçalhos já presentes (ex.: x-client-ip dos route handlers) são preservados.
 */
export function withInternalSecret(
  baseFetch: typeof fetch,
  apiUrl: string,
  secret: string | undefined,
): typeof fetch {
  if (!secret || !apiUrl) return baseFetch
  const prefix = apiUrl.replace(/\/$/, '')
  return (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (!url.startsWith(prefix)) return baseFetch(input, init)
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    )
    if (!headers.has('x-internal-proxy-secret')) headers.set('x-internal-proxy-secret', secret)
    return baseFetch(input, { ...init, headers })
  }
}
