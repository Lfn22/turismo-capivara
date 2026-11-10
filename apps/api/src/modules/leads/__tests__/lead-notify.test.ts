import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const send = vi.fn()
let resendInstance: { emails: { send: typeof send } } | null = null
vi.mock('../../../shared/email', () => ({
  getResend: () => resendInstance,
  getEmailFrom: () => 'CAPI <no-reply@capi.test>',
}))

import { notifyLeadCreated } from '../lead-notify'

const log: any = { warn: vi.fn() }
const lead: any = {
  id: 'l1',
  name: 'Maria Turista',
  whatsapp: '(89) 99999-0000',
  destinationTitle: 'Serra da Capivara',
  packageId: null,
  travelMonth: null,
  utmSource: 'meta',
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  utmTerm: null,
}

describe('notifyLeadCreated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resendInstance = { emails: { send } }
    process.env.LEAD_NOTIFY_EMAIL = 'equipe@capi.test'
    send.mockResolvedValue({ data: { id: 'e1' }, error: null })
  })
  afterEach(() => {
    delete process.env.LEAD_NOTIFY_EMAIL
  })

  it('sem LEAD_NOTIFY_EMAIL → warn e não envia', async () => {
    delete process.env.LEAD_NOTIFY_EMAIL
    await notifyLeadCreated(log, lead)
    expect(log.warn).toHaveBeenCalledTimes(1)
    expect(send).not.toHaveBeenCalled()
  })

  it('sem Resend → warn e não envia', async () => {
    resendInstance = null
    await notifyLeadCreated(log, lead)
    expect(log.warn).toHaveBeenCalledTimes(1)
    expect(send).not.toHaveBeenCalled()
  })

  it('send retorna { error } → warn', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'bad' } })
    await notifyLeadCreated(log, lead)
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ leadId: 'l1', err: { message: 'bad' } }), expect.any(String))
  })

  it('send lança → warn e não propaga', async () => {
    send.mockRejectedValue(new Error('boom'))
    await expect(notifyLeadCreated(log, lead)).resolves.toBeUndefined()
    expect(log.warn).toHaveBeenCalledTimes(1)
  })

  it('sucesso → envia para LEAD_NOTIFY_EMAIL com nome e destino no assunto, e nome do roteiro', async () => {
    await notifyLeadCreated(log, { ...lead, packageName: 'Trilha do Boqueirão' })
    expect(log.warn).not.toHaveBeenCalled()
    const arg = send.mock.calls[0][0]
    expect(arg.to).toBe('equipe@capi.test')
    expect(arg.subject).toContain('Maria Turista')
    expect(arg.subject).toContain('Serra da Capivara')
    expect(arg.html).toContain('Roteiro:</strong> Trilha do Boqueirão')
  })
})
