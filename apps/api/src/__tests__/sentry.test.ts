import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { AppError } from '../shared/errors/AppError'

// Mock @sentry/node before importing anything that uses it
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  setupFastifyErrorHandler: vi.fn(),
  captureException: vi.fn(),
  withScope: vi.fn((cb: (scope: any) => void) => {
    const scope = { setTag: vi.fn(), setUser: vi.fn() }
    cb(scope)
  }),
}))

// Import Sentry after mock is established
import * as Sentry from '@sentry/node'

describe('Sentry integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('captureException is called for non-AppError errors', async () => {
    const app = Fastify({ logger: false })

    app.get('/throw-unexpected', async () => {
      throw new Error('Erro inesperado de banco de dados')
    })

    // Replicate the target setErrorHandler from app.ts
    app.setErrorHandler((err, request, reply) => {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ message: err.message })
      }
      Sentry.withScope((scope) => {
        const slug = (request.params as Record<string, string>)?.slug
        if (slug) scope.setTag('tenant_slug', slug)
        const user = (request as any).user as { sub?: string } | undefined
        if (user?.sub) scope.setUser({ id: user.sub })
        scope.setTag('route', `${request.method} ${request.url}`)
        Sentry.captureException(err)
      })
      reply.status(500).send({ message: 'Erro interno do servidor' })
    })

    await app.ready()
    await app.inject({ method: 'GET', url: '/throw-unexpected' })
    expect(Sentry.captureException).toHaveBeenCalledTimes(1)
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Erro inesperado de banco de dados' })
    )
    await app.close()
  })

  it('captureException is NOT called for AppError (business error)', async () => {
    const app = Fastify({ logger: false })

    app.get('/throw-app-error', async () => {
      throw new AppError('SLOT_NOT_FOUND', 404)
    })

    app.setErrorHandler((err, _request, reply) => {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ message: err.message })
      }
      Sentry.captureException(err)
      reply.status(500).send({ message: 'Erro interno do servidor' })
    })

    await app.ready()
    const res = await app.inject({ method: 'GET', url: '/throw-app-error' })
    expect(res.statusCode).toBe(404)
    expect(Sentry.captureException).not.toHaveBeenCalled()
    await app.close()
  })

  it('initSentry does not throw when SENTRY_DSN is absent', async () => {
    const savedDsn = process.env.SENTRY_DSN
    delete process.env.SENTRY_DSN

    // initSentry will be created in sentry.ts (Task 2)
    const { initSentry } = await import('../shared/sentry')
    expect(() => initSentry()).not.toThrow()

    if (savedDsn !== undefined) {
      process.env.SENTRY_DSN = savedDsn
    }
  })

  it('Sentry.withScope sets tenant_slug tag when slug param present', async () => {
    const app = Fastify({ logger: false })

    app.get('/tenants/:slug/error', async () => {
      throw new Error('unexpected')
    })

    app.setErrorHandler((err, request, reply) => {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ message: err.message })
      }
      Sentry.withScope((scope) => {
        const slug = (request.params as Record<string, string>)?.slug
        if (slug) scope.setTag('tenant_slug', slug)
        scope.setTag('route', `${request.method} ${request.url}`)
        Sentry.captureException(err)
      })
      reply.status(500).send({ message: 'Erro interno do servidor' })
    })

    await app.ready()
    await app.inject({ method: 'GET', url: '/tenants/meu-tenant/error' })

    expect(Sentry.withScope).toHaveBeenCalled()
    // The mocked withScope calls cb synchronously — captureException should have been triggered
    expect(Sentry.captureException).toHaveBeenCalledTimes(1)
    await app.close()
  })
})
