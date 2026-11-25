type Check = 'ok' | 'error' | 'skipped'

/**
 * O healthcheck do Railway reinicia o serviço quando recebe != 200. Só o banco é
 * essencial para a API responder; storage (R2) e e-mail fora do ar deixam o status
 * "degraded" (visível no corpo/monitoramento), mas não derrubam uma API saudável.
 */
export function healthResponse(checks: Record<string, Check>): {
  httpStatus: number
  status: 'healthy' | 'degraded' | 'unhealthy'
} {
  if (checks.database === 'error') return { httpStatus: 503, status: 'unhealthy' }
  const allOk = Object.values(checks).every((v) => v === 'ok' || v === 'skipped')
  return { httpStatus: 200, status: allOk ? 'healthy' : 'degraded' }
}
