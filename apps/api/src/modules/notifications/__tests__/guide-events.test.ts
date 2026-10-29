import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../database', () => ({
  default: {
    user: { findUnique: vi.fn() },
    tourPackage: { findUnique: vi.fn() },
    guideAffiliation: { findUnique: vi.fn() },
    packageGuide: { findUnique: vi.fn() },
  },
}))
vi.mock('../notifications.service', () => ({
  notify: vi.fn(),
  resolveAction: vi.fn(),
  platformStaffIds: vi.fn(),
  tenantAdminIds: vi.fn(),
}))

import prisma from '../../../database'
import { notify, resolveAction, platformStaffIds, tenantAdminIds } from '../notifications.service'
import { notifyGuideRegistered, notifyAffiliationRequested, notifyGuideDecision, notifyAffiliationDecision, notifyGuideJoinedPackage, notifyDestinationMembership, notifyPackageRequest, notifyPackageDecision, notifyPackageLeft } from '../guide-events'

const db = prisma as any
const log = { warn: vi.fn() } as any

const guideRow = { id: 'g1', name: 'Rui', tenantId: 't1', tenant: { slug: 'capivara' } }

beforeEach(() => {
  vi.clearAllMocks()
  ;(platformStaffIds as any).mockResolvedValue(['s1'])
  ;(tenantAdminIds as any).mockResolvedValue(['a1'])
})

describe('notifyGuideRegistered', () => {
  it('avisa só a equipe, com link para a verificação', async () => {
    db.user.findUnique.mockResolvedValue(guideRow)
    await notifyGuideRegistered(log, 'g1')
    expect(notify).toHaveBeenCalledTimes(1)
    expect(notify).toHaveBeenCalledWith({
      userIds: ['s1'],
      type: 'guide.registered',
      title: 'Guia aguardando verificação',
      body: 'Rui enviou cadastro',
      groupKey: 'guide.registered',
      actionKey: 'guide-verification:g1',
      link: '/super-admin/guias',
    })
    expect(tenantAdminIds).not.toHaveBeenCalled()
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

describe('notifyAffiliationRequested', () => {
  it('avisa os ADMINs do tenant declarado', async () => {
    db.guideAffiliation.findUnique.mockResolvedValue({
      id: 'af1',
      tenantId: 't2',
      tenant: { name: 'Agência X', slug: 'agencia-x' },
      guide: { user: { name: 'Rui' } },
    })
    await notifyAffiliationRequested(log, 'af1')
    expect(tenantAdminIds).toHaveBeenCalledWith('t2')
    expect(notify).toHaveBeenCalledWith({
      userIds: ['a1'],
      type: 'guide.affiliation-requested',
      title: 'Guia quer se vincular à sua agência',
      body: 'Rui declarou atuar com Agência X',
      groupKey: 'guide.affiliation-requested',
      actionKey: 'guide-affiliation:af1',
      link: '/agencia-x/admin/guias',
    })
  })

  it('vínculo inexistente: não notifica', async () => {
    db.guideAffiliation.findUnique.mockResolvedValue(null)
    await notifyAffiliationRequested(log, 'af1')
    expect(notify).not.toHaveBeenCalled()
  })

  it('não lança e registra warn quando o banco falha', async () => {
    db.guideAffiliation.findUnique.mockRejectedValue(new Error('db'))
    await expect(notifyAffiliationRequested(log, 'af1')).resolves.toBeUndefined()
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ affiliationId: 'af1' }),
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
      link: '/guia/status',
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

describe('notifyAffiliationDecision', () => {
  beforeEach(() => {
    db.guideAffiliation.findUnique.mockReset()
    db.user.findUnique.mockReset()
    ;(resolveAction as any).mockReset()
    ;(notify as any).mockReset()
  })

  const aff = (status: string) => ({
    status,
    rejectionReason: 'Não conhecemos',
    tenant: { name: 'Agência X' },
    guide: { userId: 'g1' },
  })

  it('aceite: resolve a pendência e avisa o guia para entrar de novo', async () => {
    db.guideAffiliation.findUnique.mockResolvedValue(aff('ACCEPTED'))
    db.user.findUnique.mockResolvedValue({ name: 'Dono' })
    await notifyAffiliationDecision(log, 'aff1', 'adm1')
    expect(resolveAction).toHaveBeenCalledWith('guide-affiliation:aff1', 'Dono')
    expect(notify).toHaveBeenCalledWith({
      userIds: ['g1'],
      type: 'guide.affiliation-accepted',
      title: 'Vínculo confirmado',
      body: 'Agência X confirmou seu vínculo. Entre de novo para ver o painel da agência.',
      link: '/guia/status',
    })
  })

  it('recusa: inclui o motivo', async () => {
    db.guideAffiliation.findUnique.mockResolvedValue(aff('REJECTED'))
    db.user.findUnique.mockResolvedValue({ name: 'Dono' })
    await notifyAffiliationDecision(log, 'aff1', 'adm1')
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'guide.affiliation-rejected', body: 'Agência X: Não conhecemos' }),
    )
  })

  it('não lança quando o banco falha', async () => {
    db.guideAffiliation.findUnique.mockRejectedValue(new Error('db'))
    await expect(notifyAffiliationDecision(log, 'aff1', 'adm1')).resolves.toBeUndefined()
    expect(log.warn).toHaveBeenCalled()
  })
})

describe('notifyDestinationMembership', () => {
  beforeEach(() => {
    db.destination = { findUnique: vi.fn().mockResolvedValue({ title: 'Serra Azul', slug: 'serra-azul' }) }
    db.user.findUnique.mockResolvedValue({ name: 'Rui', tenantId: 't1', tenant: { slug: 'capivara' } })
  })

  it('joined: avisa ADMINs do tenant do guia', async () => {
    await notifyDestinationMembership(log, 'g1', 'd1', 'joined')
    expect(notify).toHaveBeenCalledWith({
      userIds: ['a1'],
      type: 'destination.guide-joined',
      title: 'Guia passou a atuar em Serra Azul',
      body: 'Rui',
      link: '/destinos/serra-azul',
    })
  })

  it('left: texto de saída', async () => {
    await notifyDestinationMembership(log, 'g1', 'd1', 'left')
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'destination.guide-left',
      title: 'Guia deixou de atuar em Serra Azul',
    }))
  })

  it('não notifica quando o tenant do guia é independente', async () => {
    db.user.findUnique.mockResolvedValue({ name: 'Rui', tenantId: 't0', tenant: { slug: 'independente' } })
    await notifyDestinationMembership(log, 'g1', 'd1', 'joined')
    expect(notify).not.toHaveBeenCalled()
  })

  it('não lança e registra warn quando o banco falha', async () => {
    db.user.findUnique.mockRejectedValue(new Error('db'))
    await expect(notifyDestinationMembership(log, 'g1', 'd1', 'joined')).resolves.toBeUndefined()
    expect(log.warn).toHaveBeenCalled()
  })
})

describe('eventos de pedido de roteiro', () => {
  const pgReq = (slug: string) => ({
    id: 'pg1',
    packageId: 'p1',
    guide: { userId: 'g1', user: { name: 'Rui' } },
    package: { name: 'Trilha', tenantId: 't1', conductorId: 'c1', tenant: { slug } },
  })

  it('notifyPackageRequest: ADMINs do tenant + equipe, sem o guia', async () => {
    db.packageGuide.findUnique.mockResolvedValue(pgReq('capivara'))
    ;(tenantAdminIds as any).mockResolvedValue(['a1', 'g1'])
    await notifyPackageRequest(log, 'pg1')
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      userIds: ['a1', 's1'],
      type: 'package.guide-requested',
      title: 'Pedido para atuar em roteiro',
      body: 'Rui · Trilha',
      actionKey: 'package-request:pg1',
      link: '/pendencias?package=p1',
    }))
  })

  it('notifyPackageRequest: tenant independente avisa o condutor', async () => {
    db.packageGuide.findUnique.mockResolvedValue(pgReq('independente'))
    await notifyPackageRequest(log, 'pg1')
    expect(tenantAdminIds).not.toHaveBeenCalled()
    expect((notify as any).mock.calls[0][0].userIds).toEqual(['c1', 's1'])
  })

  it('notifyPackageRequest: não lança e registra warn', async () => {
    db.packageGuide.findUnique.mockRejectedValue(new Error('db'))
    await expect(notifyPackageRequest(log, 'pg1')).resolves.toBeUndefined()
    expect(log.warn).toHaveBeenCalled()
  })

  const decided = (status: string) => ({
    status,
    rejectionReason: 'Sem vaga',
    package: { name: 'Trilha' },
    guide: { userId: 'g1', user: { tenant: { slug: 'capivara' } } },
  })

  it('notifyPackageDecision: aceito resolve a pendência e avisa o guia', async () => {
    db.packageGuide.findUnique.mockResolvedValue(decided('ACCEPTED'))
    db.user.findUnique.mockResolvedValue({ name: 'Dono' })
    await notifyPackageDecision(log, 'pg1', 'a1')
    expect(resolveAction).toHaveBeenCalledWith('package-request:pg1', 'Dono')
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      userIds: ['g1'],
      type: 'package.request-accepted',
      body: 'Você agora atua em Trilha',
      link: '/capivara/painel/perfil',
    }))
  })

  it('notifyPackageDecision: recusado inclui o motivo', async () => {
    db.packageGuide.findUnique.mockResolvedValue(decided('REJECTED'))
    db.user.findUnique.mockResolvedValue({ name: 'Dono' })
    await notifyPackageDecision(log, 'pg1', 'a1')
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'package.request-rejected',
      body: 'Trilha: Sem vaga',
    }))
  })

  it('notifyPackageDecision: ainda PENDING não faz nada', async () => {
    db.packageGuide.findUnique.mockResolvedValue(decided('PENDING'))
    db.user.findUnique.mockResolvedValue({ name: 'Dono' })
    await notifyPackageDecision(log, 'pg1', 'a1')
    expect(notify).not.toHaveBeenCalled()
  })

  it('notifyPackageLeft: avisa ADMINs, exceto o guia', async () => {
    db.packageGuide.findUnique.mockResolvedValue({
      packageId: 'p1',
      guide: { userId: 'g1', user: { name: 'Rui' } },
      package: { name: 'Trilha', tenantId: 't1', tenant: { slug: 'capivara' } },
    })
    ;(tenantAdminIds as any).mockResolvedValue(['a1', 'g1'])
    await notifyPackageLeft(log, 'pg1')
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      userIds: ['a1'],
      type: 'package.guide-left',
      title: 'Guia saiu do roteiro',
      body: 'Rui · Trilha',
      link: '/capivara/painel/roteiros/p1',
    }))
  })

  it('notifyPackageLeft: não lança', async () => {
    db.packageGuide.findUnique.mockRejectedValue(new Error('db'))
    await expect(notifyPackageLeft(log, 'pg1')).resolves.toBeUndefined()
  })
})
