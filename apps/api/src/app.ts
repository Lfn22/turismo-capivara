import 'dotenv/config'
import { initSentry, Sentry } from './shared/sentry'

// Must be called before Fastify is created (per D-08 / Sentry docs)
initSentry()

import Fastify from 'fastify'
import rawBody from 'fastify-raw-body'
import jwt from '@fastify/jwt'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { tenantsRoutes } from './modules/tenants/tenants.routes'
import { packagesRoutes } from './modules/packages/packages.routes'
import { bookingsRoutes } from './modules/bookings/bookings.routes'
import { authRoutes } from './modules/auth/auth.routes'
import { usersRoutes } from './modules/users/users.routes'
import { guidesRoutes } from './modules/guides/guides.routes'
import { webhooksRoutes } from './modules/webhooks/webhooks.routes'
import { destinationsRoutes } from './modules/destinations/destinations.routes'
import { AppError } from './shared/errors/AppError'

const app = Fastify({ logger: true, trustProxy: true })

// Sentry MUST be registered before custom setErrorHandler (per D-08)
// This adds Sentry as an outer error handler in the Fastify lifecycle.
Sentry.setupFastifyErrorHandler(app)

app.register(rawBody, {
  global: false,
  encoding: false,
  runFirst: true,
})

app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
})

app.register(helmet)

app.register(rateLimit, {
  global: true,
  max: 20,
  timeWindow: '1 minute',
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
    'retry-after': true,
  },
  // In-memory LRU — Redis deferred (post-MVP, multi-instance scenario)
})

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

app.register(jwt, {
  secret: process.env.JWT_SECRET,
})

app.get('/health', { config: { rateLimit: false } }, async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

app.register(authRoutes)
app.register(tenantsRoutes)
app.register(packagesRoutes)
app.register(bookingsRoutes)
app.register(usersRoutes)
app.register(guidesRoutes)
app.register(webhooksRoutes)
app.register(destinationsRoutes)

app.setErrorHandler((err, request, reply) => {
  if (err instanceof AppError) {
    // Business error — expected, do NOT send to Sentry (per D-07)
    return reply.status(err.statusCode).send({ message: err.message })
  }
  // Unexpected error — capture with tenant/user context (per D-06)
  Sentry.withScope((scope) => {
    const params = request.params as Record<string, string>
    if (params?.slug) scope.setTag('tenant_slug', params.slug)
    const user = (request as any).user as { sub?: string } | undefined
    if (user?.sub) scope.setUser({ id: user.sub })
    scope.setTag('route', `${request.method} ${request.url}`)
    Sentry.captureException(err)
  })
  app.log.error(err)
  reply.status(500).send({ message: 'Erro interno do servidor' })
})

const start = async () => {
  try {
    await app.listen({ port: 3333, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
