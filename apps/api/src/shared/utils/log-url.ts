/**
 * URL segura para logs/Sentry: sem query string. Rotas públicas recebem PII na query
 * (ex.: GET /tenants/:slug/bookings/:id?email=...), que não pode ir para log.
 */
export function pathOnly(url: string): string {
  const i = url.indexOf('?')
  return i === -1 ? url : url.slice(0, i)
}
