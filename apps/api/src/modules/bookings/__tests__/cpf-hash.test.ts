import { describe, it, expect, beforeEach } from 'vitest'

describe('hashCpf', () => {
  beforeEach(() => {
    process.env.CPF_SECRET = 'test-secret'
  })

  it('returns 64-char hex string for valid CPF', async () => {
    const { hashCpf } = await import('../../../shared/utils/hash')
    const result = hashCpf('12345678901')
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic — same input, same output', async () => {
    const { hashCpf } = await import('../../../shared/utils/hash')
    expect(hashCpf('12345678901')).toBe(hashCpf('12345678901'))
  })

  it('throws when CPF_SECRET is not set', async () => {
    delete process.env.CPF_SECRET
    const { hashCpf } = await import('../../../shared/utils/hash')
    expect(() => hashCpf('12345678901')).toThrow('CPF_SECRET')
  })
})
