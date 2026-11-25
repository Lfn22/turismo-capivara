/**
 * Origens aceitas pelo CORS. `CORS_ORIGIN` aceita uma lista separada por vírgula
 * (ex.: domínio próprio + domínio do Railway); o @fastify/cors devolve no
 * Access-Control-Allow-Origin a origem pedida quando ela está na lista.
 */
export function corsOrigins(value: string | undefined): string[] {
  const origins = (value ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  return origins.length > 0 ? origins : ['http://localhost:3000']
}
