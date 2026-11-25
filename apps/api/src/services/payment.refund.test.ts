import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../shared/metrics', () => ({ paymentsFailedCounter: { add: vi.fn() } }))

import { refundPayment } from './payment.service'

describe('refundPayment', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    process.env.MP_ACCESS_TOKEN = 'test-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.MP_ACCESS_TOKEN
  })

  it('pede estorno total ao MP com chave de idempotência estável por pagamento', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, text: async () => '' })

    await refundPayment('12345')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.mercadopago.com/v1/payments/12345/refunds')
    expect(init.method).toBe('POST')
    expect(init.headers['X-Idempotency-Key']).toBe('refund-12345')
    expect(init.headers.Authorization).toBe('Bearer test-token')
  })

  it('lança erro quando o MP recusa o estorno', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' })
    await expect(refundPayment('12345')).rejects.toThrow(/HTTP 400/)
  })

  it('em dev sem token não chama o MP', async () => {
    delete process.env.MP_ACCESS_TOKEN
    await refundPayment('mock_1')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
