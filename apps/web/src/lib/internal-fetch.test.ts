import { describe, it, expect, vi } from 'vitest'
import { withInternalSecret } from './internal-fetch'

describe('withInternalSecret', () => {
  const base = vi.fn(async () => new Response('{}'))

  it('chamadas para a API ganham o segredo, preservando os outros cabeçalhos', async () => {
    const f = withInternalSecret(
      base as unknown as typeof fetch,
      'https://api.x',
      's3cret-s3cret-s3cret',
    )
    await f('https://api.x/tenants/capi/packages', { headers: { 'x-client-ip': '7.7.7.7' } })
    const h = new Headers((base.mock.calls[0] as unknown as [string, RequestInit])[1].headers)
    expect(h.get('x-internal-proxy-secret')).toBe('s3cret-s3cret-s3cret')
    expect(h.get('x-client-ip')).toBe('7.7.7.7')
  })

  it('outros domínios não recebem o segredo', async () => {
    base.mockClear()
    const f = withInternalSecret(
      base as unknown as typeof fetch,
      'https://api.x',
      's3cret-s3cret-s3cret',
    )
    await f('https://api.mercadopago.com/v1/x')
    expect((base.mock.calls[0] as unknown[])[1]).toBeUndefined()
  })

  it('sem segredo configurado devolve o fetch original', () => {
    expect(withInternalSecret(base as unknown as typeof fetch, 'https://api.x', undefined)).toBe(
      base,
    )
  })
})
