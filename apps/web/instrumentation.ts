export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
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
