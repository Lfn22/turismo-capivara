import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { AppError } from '../../shared/errors/AppError'

/**
 * Fixed JWT secret for tests — 32+ chars required by @fastify/jwt.
 */
export const TEST_JWT_SECRET = 'test-secret-minimum-32-characters-xx'

/**
 * Builds a minimal Fastify app for integration tests.
 * Registers JWT plugin + provided route plugins + error handler.
 * Does NOT start a real HTTP server — use app.inject() for requests.
 */
export function buildApp(
  ...routePlugins: Array<(app: FastifyInstance) => Promise<void>>
): FastifyInstance {
  const app = Fastify({ logger: false })

  app.register(jwt, { secret: TEST_JWT_SECRET })

  for (const plugin of routePlugins) {
    app.register(plugin)
  }

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({ message: err.message })
    }
    reply.status(500).send({ message: 'Erro interno' })
  })

  return app
}
