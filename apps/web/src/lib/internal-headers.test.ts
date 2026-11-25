import { describe, it, expect, afterEach } from 'vitest'
import { internalProxyHeaders } from './internal-headers'

afterEach(() => {
  delete process.env.INTERNAL_PROXY_SECRET
})

describe('internalProxyHeaders', () => {
  it('sem segredo configurado não envia nada', () => {
    expect(internalProxyHeaders(new Headers({ 'x-forwarded-for': '1.2.3.4' }))).toEqual({})
  })

  it('repassa o IP acrescentado pela borda (último da lista), não o forjado', () => {
    process.env.INTERNAL_PROXY_SECRET = 's3cret-s3cret-s3cret'
    const h = internalProxyHeaders(new Headers({ 'x-forwarded-for': '6.6.6.6, 7.7.7.7' }))
    expect(h).toEqual({
      'x-internal-proxy-secret': 's3cret-s3cret-s3cret',
      'x-client-ip': '7.7.7.7',
    })
  })

  it('sem X-Forwarded-For envia só o segredo', () => {
    process.env.INTERNAL_PROXY_SECRET = 's3cret-s3cret-s3cret'
    expect(internalProxyHeaders(new Headers())).toEqual({
      'x-internal-proxy-secret': 's3cret-s3cret-s3cret',
    })
  })
})
