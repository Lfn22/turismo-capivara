import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../database', () => ({
  default: {
    $queryRaw: vi.fn(),
    notification: { findMany: vi.fn(), updateMany: vi.fn() },
  },
}))

vi.mock('../../../shared/email', () => ({
  getResend: vi.fn(),
  getEmailFrom: vi.fn().mockReturnValue('CAPI <no-reply@x.com>'),
}))

import prisma from '../../../database'
import { getResend } from '../../../shared/email'
import { createNotificationDigestJob } from '../digest.job'
import { digestEmailText, digestSubject } from '../emails/digest-email'

const mockPrisma = prisma as any
const mockGetResend = getResend as ReturnType<typeof vi.fn>

function makeApp() {
  return { log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } } as any
}

const u1 = { id: 'u1', name: 'Ana', email: 'u1@x.com', role: 'ADMIN' }
const u2 = { id: 'u2', name: 'Bia', email: 'u2@x.com', role: 'PLATFORM_ADMIN' }
const rows = [
  { id: 'n1', title: 'T1', body: 'B1', count: 1, user: u1 },
  { id: 'n2', title: 'T2', body: 'B2', count: 3, user: u1 },
  { id: 'n3', title: 'T3', body: 'B3', count: 1, user: u2 },
]

beforeEach(() => {
  vi.resetAllMocks()
  mockPrisma.$queryRaw.mockResolvedValue([{ pg_try_advisory_lock: true }])
})

describe('createNotificationDigestJob', () => {
  it('has the daily 08:00 São Paulo schedule', () => {
    const job = createNotificationDigestJob(makeApp())
    expect(job.cronTime).toBe('0 8 * * *')
    expect(job.timeZone).toBe('America/Sao_Paulo')
  })

  it('does nothing when the lock is not obtained', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ pg_try_advisory_lock: false }])
    await createNotificationDigestJob(makeApp()).onTick()
    expect(mockPrisma.notification.findMany).not.toHaveBeenCalled()
  })

  it('queries unread, undigested notifications of admins', async () => {
    mockGetResend.mockReturnValue({ emails: { send: vi.fn() } })
    mockPrisma.notification.findMany.mockResolvedValueOnce([])
    await createNotificationDigestJob(makeApp()).onTick()
    const arg = mockPrisma.notification.findMany.mock.calls[0][0]
    expect(arg.where).toEqual({
      readAt: null,
      digestedAt: null,
      user: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'PLATFORM_ADMIN'] } },
    })
  })

  it('sends one email per user and marks their rows as digested', async () => {
    const send = vi.fn().mockResolvedValue({})
    mockGetResend.mockReturnValue({ emails: { send } })
    mockPrisma.notification.findMany.mockResolvedValueOnce(rows)
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 })

    await createNotificationDigestJob(makeApp()).onTick()

    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[0][0]).toMatchObject({
      to: ['u1@x.com'],
      subject: 'Você tem 2 novidade(s) na CAPI',
    })
    expect(send.mock.calls[0][0].text).toContain('Veja tudo no sininho em: http://localhost:3000/')
    expect(send.mock.calls[1][0].text).toContain('Veja tudo em: http://localhost:3000/pendencias')
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['n1', 'n2'] } },
      data: { digestedAt: expect.any(Date) },
    })
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['n3'] } },
      data: { digestedAt: expect.any(Date) },
    })
  })

  it('does not mark a user whose send failed, but continues with the next', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({})
    mockGetResend.mockReturnValue({ emails: { send } })
    mockPrisma.notification.findMany.mockResolvedValueOnce(rows)
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 })

    await createNotificationDigestJob(makeApp()).onTick()

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledTimes(1)
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['n3'] } },
      data: { digestedAt: expect.any(Date) },
    })
  })

  it('does not mark a user when Resend resolves with an error', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'x' } })
      .mockResolvedValueOnce({ data: {}, error: null })
    mockGetResend.mockReturnValue({ emails: { send } })
    mockPrisma.notification.findMany.mockResolvedValueOnce(rows)
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 })

    await createNotificationDigestJob(makeApp()).onTick()

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledTimes(1)
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['n3'] } },
      data: { digestedAt: expect.any(Date) },
    })
  })

  it('marks nothing without RESEND_API_KEY', async () => {
    mockGetResend.mockReturnValue(null)
    mockPrisma.notification.findMany.mockResolvedValueOnce(rows)
    await createNotificationDigestJob(makeApp()).onTick()
    expect(mockPrisma.notification.updateMany).not.toHaveBeenCalled()
  })
})

describe('digest email', () => {
  it('subject', () => {
    expect(digestSubject(5)).toBe('Você tem 5 novidade(s) na CAPI')
  })

  it('text lists items and link', () => {
    const text = digestEmailText({
      name: 'Ana',
      items: [
        { title: 'A', body: 'a', count: 1 },
        { title: 'B', body: 'b', count: 3 },
      ],
      link: 'https://capi.test/pendencias',
    })
    expect(text).toContain('Olá, Ana')
    expect(text).toContain('A — a')
    expect(text).not.toContain('A — a (')
    expect(text).toContain('B — b (3x)')
    expect(text).toContain('https://capi.test/pendencias')
  })
})
