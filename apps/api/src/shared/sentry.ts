import * as Sentry from '@sentry/node'

/**
 * Initialize Sentry error monitoring.
 * MUST be called before creating the Fastify app instance.
 * Gracefully no-ops if SENTRY_DSN is not set (per D-10).
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    // No DSN — Sentry disabled. App continues normally.
    return
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  })
}

export { Sentry }
