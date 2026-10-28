import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../database', () => ({
  default: { user: { findUnique: vi.fn() }, tourPackage: { findUnique: vi.fn() } },
}))
vi.mock('../notifications.service', () => ({
  notify: vi.fn(),
  resolveAction: vi.fn(),
  platformStaffIds: vi.fn(),
  tenantAdminIds: vi.fn(),
}))

import prisma from '../../../database'
import { notify, resolveAction, platformStaffIds, tenantAdminIds } from '../notifications.service'
import { notifyGuideRegistered, notifyGuideDecision, notifyGuideJoinedPackage } from '../guide-events'

const db = prisma as any
const log = { warn: vi.fn() } as any

const guideRow = { id: 'g1', name: 'Rui', tenantId: 't1', tenant: { slug: 'capivara' } }

beforeEach(() => {
  vi.clearAllMocks()
  ;(platformStaffIds as any).mockResolvedValue(['s1'])
  ;(tenantAdminIds as any).mockResolvedValue(['a1'])
})

describe('notifyGuideRegistered', () => {
  it('avisa staff e ADMINs com links e actionKey próprios', async () => {
    db.user.findUnique.mockResolvedValue(guideRow)
    await notifyGuideRegistered(log, 'g1')
    const base = {
      type: 'guide.registered',
      title: 'Guia aguardando verificação',
      body: 'Rui enviou cadastro',
      groupKey: 'guide.registered',
      actionKey: 'guide-verification:g1',
    }
    expect(notify).toHaveBeenCalledTimes(2)
    expect(notify).toHaveBeenNthCalledWith(1, { userIds: ['s1'], ...base, link: '/pendencias' })
    expect(notify).toHaveBeenNthCalledWith(2, { userIds: ['a1'], ...base, link: '/capivara/admin/guias' })
  })

  it('tenant independente sem ADMINs: segunda chamada com lista vazia', async () => {
    db.user.findUnique.mockResolvedValue({ ...guideRow, tenant: { slug: 'independente' } })
    ;(tenantAdminIds as any).mockResolvedValue([])
    await notifyGuideRegistered(log, 'g1')
    expect(notify).toHaveBeenNthCalledWith(1, expect.objectContaining({ userIds: ['s1'], link: '/pendencias' }))
    expect(notify).toHaveBeenNthCalledWith(2, expect.objectContaining({ userIds: [] }))
  })

  it('não lança e registra warn quando o banco falha', async () => {
    db.user.findUnique.mockRejectedValue(new Error('db'))
    await expect(notifyGuideRegistered(log, 'g1')).resolves.toBeUndefined()
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ guideUserId: 'g1' }),
      '[notif] Falha ao notificar evento de guia',
    )
  })
})

describe('notifyGuideDecision', () => {
  beforeEach(() => {
    db.user.findUnique.mockImplementation(async ({ where }: any) =>
      where.id === 'adm1' ? { name: 'Fulana' } : { tenant: { slug: 'capivara' } },
    )
  })

  it('aprovado: resolve a pendência e avisa o guia', async () => {
    await notifyGuideDecision(log, 'g1', { approved: true }, 'adm1')
    expect(resolveAction).toHaveBeenCalledWith('guide-verification:g1', 'Fulana')
    expect(notify).toHaveBeenCalledWith({
      userIds: ['g1'],
      type: 'guide.approved',
      title: 'Cadastro aprovado',
      body: 'Seu perfil já pode aparecer no site.',
      link: '/capivara/painel/perfil',
    })
  })

  it('recusado: inclui o motivo e também resolve a pendência', async () => {
    await notifyGuideDecision(log, 'g1', { approved: false, reason: 'Documento ilegível' }, 'adm1')
    expect(resolveAction).toHaveBeenCalledWith('guide-verification:g1', 'Fulana')
    expect(notify).toHaveBeenCalledWith({
      userIds: ['g1'],
      type: 'guide.rejected',
      title: 'Cadastro recusado',
      body: 'Motivo: Documento ilegível',
      link: '/capivara/painel/perfil',
    })
  })

  it('decisor não encontrado: usa "Admin"', async () => {
    db.user.findUnique.mockImplementation(async ({ where }: any) =>
      where.id === 'adm1' ? null : { tenant: { slug: 'capivara' } },
    )
    await notifyGuideDecision(log, 'g1', { approved: true }, 'adm1')
    expect(resolveAction).toHaveBeenCalledWith('guide-verification:g1', 'Admin')
  })

  it('não lança e registra warn quando falha', async () => {
    ;(resolveAction as any).mockRejectedValue(new Error('db'))
    await expect(notifyGuideDecision(log, 'g1', { approved: true }, 'adm1')).resolves.toBeUndefined()
    expect(log.warn).toHaveBeenCalled()
  })
})

describe('notifyGuideJoinedPackage', () => {
  it('avisa ADMINs, exceto o próprio guia', async () => {
    db.user.findUnique.mockResolvedValue({ name: 'Rui' })
    db.tourPackage.findUnique.mockResolvedValue({
      name: 'Boqueirão',
      tenantId: 't2',
      tenant: { slug: 'agencia-x' },
    })
    ;(tenantAdminIds as any).mockResolvedValue(['a2', 'g1'])
    await notifyGuideJoinedPackage(log, 'g1', 'p1')
    expect(tenantAdminIds).toHaveBeenCalledWith('t2')
    expect(notify).toHaveBeenCalledWith({
      userIds: ['a2'],
      type: 'package.guide-joined',
      title: 'Guia entrou no roteiro',
      body: 'Rui · Boqueirão',
      link: '/agencia-x/painel/roteiros/p1',
    })
  })

  it('não lança e registra warn quando o banco falha', async () => {
    db.user.findUnique.mockRejectedValue(new Error('db'))
    await expect(notifyGuideJoinedPackage(log, 'g1', 'p1')).resolves.toBeUndefined()
    expect(log.warn).toHaveBeenCalled()
  })
})
