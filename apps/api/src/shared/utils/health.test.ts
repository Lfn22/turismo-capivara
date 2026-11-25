import { describe, it, expect } from 'vitest'
import { healthResponse } from './health'

describe('healthResponse', () => {
  it('R2 fora do ar não derruba o healthcheck (200 degraded)', () => {
    expect(healthResponse({ database: 'ok', storage: 'error', email: 'ok' })).toEqual({
      httpStatus: 200,
      status: 'degraded',
    })
  })

  it('banco fora do ar → 503', () => {
    expect(healthResponse({ database: 'error', storage: 'ok' }).httpStatus).toBe(503)
  })

  it('tudo ok → 200 healthy', () => {
    expect(healthResponse({ database: 'ok', storage: 'skipped', email: 'ok' })).toEqual({
      httpStatus: 200,
      status: 'healthy',
    })
  })
})
