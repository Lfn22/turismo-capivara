export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')

    // SSR → API com o segredo interno (fora do rate limit global da API). No-op sem
    // INTERNAL_PROXY_SECRET. Ver src/lib/internal-fetch.ts.
    const { withInternalSecret } = await import('./src/lib/internal-fetch')
    globalThis.fetch = withInternalSecret(
      globalThis.fetch,
      process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '',
      process.env.INTERNAL_PROXY_SECRET,
    )
  }
}

export const onRequestError = async (
  err: { digest: string } & Error,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: { routerKind: string; routePath: string; routeType: string; renderSource: string },
) => {
  const Sentry = await import('@sentry/nextjs')
  Sentry.captureRequestError(err, request, context)
}
