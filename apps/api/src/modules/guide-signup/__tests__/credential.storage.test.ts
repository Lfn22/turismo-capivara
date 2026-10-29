import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const send = vi.fn()
vi.mock('../../../shared/config/r2', () => ({
  getR2Client: () => ({ send }),
  getR2Bucket: () => 'default-bucket',
}))

import { putCredential } from '../credential.storage'

const env = { ...process.env }
beforeEach(() => {
  send.mockReset().mockResolvedValue({})
})
afterEach(() => {
  process.env = { ...env }
  vi.restoreAllMocks()
})

describe('credential.storage bucket', () => {
  it('usa R2_CREDENTIALS_BUCKET quando definido', async () => {
    process.env.R2_CREDENTIALS_BUCKET = 'private-bucket'
    await putCredential(Buffer.from('%PDF-'), 'application/pdf')
    expect(send.mock.calls[0][0].input.Bucket).toBe('private-bucket')
  })

  it('produção sem a variável -> 500 e não grava', async () => {
    delete process.env.R2_CREDENTIALS_BUCKET
    process.env.NODE_ENV = 'production'
    await expect(putCredential(Buffer.from('%PDF-'), 'application/pdf')).rejects.toMatchObject({
      message: 'Armazenamento de comprovantes não configurado',
      statusCode: 500,
    })
    expect(send).not.toHaveBeenCalled()
  })

  it('fora de produção sem a variável -> avisa uma vez e usa o bucket padrão', async () => {
    delete process.env.R2_CREDENTIALS_BUCKET
    process.env.NODE_ENV = 'test'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await putCredential(Buffer.from('%PDF-'), 'application/pdf')
    await putCredential(Buffer.from('%PDF-'), 'application/pdf')
    expect(send.mock.calls[0][0].input.Bucket).toBe('default-bucket')
    expect(warn).toHaveBeenCalledTimes(1)
  })
})
