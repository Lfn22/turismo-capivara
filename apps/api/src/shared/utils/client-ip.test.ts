import { describe, it, expect, afterEach } from 'vitest'
import { clientIp, isInternalWithoutClient } from './client-ip'

function req(headers: Record<string, string>, ip = '10.0.0.1') {
  return { ip, headers } as any
}

afterEach(() => {
  delete process.env.INTERNAL_PROXY_SECRET
})

describe('clientIp', () => {
  it('sem segredo configurado usa request.ip e ignora x-client-ip', () => {
    expect(clientIp(req({ 'x-client-ip': '1.2.3.4' }))).toBe('10.0.0.1')
  })

  it('com segredo válido usa o IP repassado pela web', () => {
    process.env.INTERNAL_PROXY_SECRET = 's3cret-s3cret'
    const r = req({ 'x-client-ip': '1.2.3.4', 'x-internal-proxy-secret': 's3cret-s3cret' })
    expect(clientIp(r)).toBe('1.2.3.4')
  })

  it('segredo errado → x-client-ip é ignorado (não dá para forjar)', () => {
    process.env.INTERNAL_PROXY_SECRET = 's3cret-s3cret'
    const r = req({ 'x-client-ip': '1.2.3.4', 'x-internal-proxy-secret': 'chute' })
    expect(clientIp(r)).toBe('10.0.0.1')
  })
})

describe('isInternalWithoutClient', () => {
  it('chamada interna (SSR) sem IP de cliente → true', () => {
    process.env.INTERNAL_PROXY_SECRET = 's3cret-s3cret'
    expect(isInternalWithoutClient(req({ 'x-internal-proxy-secret': 's3cret-s3cret' }))).toBe(true)
  })

  it('chamada externa → false', () => {
    process.env.INTERNAL_PROXY_SECRET = 's3cret-s3cret'
    expect(isInternalWithoutClient(req({}))).toBe(false)
  })

  it('com IP de cliente → false (aplica o limite por cliente)', () => {
    process.env.INTERNAL_PROXY_SECRET = 's3cret-s3cret'
    const r = req({ 'x-client-ip': '1.2.3.4', 'x-internal-proxy-secret': 's3cret-s3cret' })
    expect(isInternalWithoutClient(r)).toBe(false)
  })
})

describe('trustProxy com saltos confiáveis (app.ts)', () => {
  it('X-Forwarded-For forjado pelo cliente não vira o IP (só o salto do Railway conta)', async () => {
    const Fastify = (await import('fastify')).default
    const { trustProxyFn } = await import('./client-ip')
    const app = Fastify({ trustProxy: trustProxyFn() })
    app.get('/ip', async (r) => ({ ip: r.ip }))
    // Cliente forja "6.6.6.6"; a borda do Railway acrescenta o IP real (7.7.7.7)
    const res = await app.inject({
      url: '/ip',
      headers: { 'x-forwarded-for': '6.6.6.6, 7.7.7.7' },
      remoteAddress: '10.0.0.9',
    })
    expect(res.json().ip).toBe('7.7.7.7')
    await app.close()
  })
})
