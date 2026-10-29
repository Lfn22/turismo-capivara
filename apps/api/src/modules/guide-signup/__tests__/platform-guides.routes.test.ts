import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from '../../../__tests__/helpers/build-app'

vi.mock('../../../database', () => {
  const db: any = {
    tenant: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    guideProfile: { findMany: vi.fn(), findUnique: vi.fn() },
    tourPackage: { findFirst: vi.fn() },
    guideAffiliation: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
  }
  db.$transaction = vi.fn(async (fn: any) => fn(db))
  return { default: db }
})
vi.mock('../credential.storage', () => ({ getCredential: vi.fn() }))
vi.mock('../../notifications/guide-events', () => ({
  notifyGuideDecision: vi.fn().mockResolvedValue(undefined),
  notifyAffiliationDecision: vi.fn().mockResolvedValue(undefined),
}))

import prisma from '../../../database'
import { getCredential } from '../credential.storage'
import { notifyGuideDecision, notifyAffiliationDecision } from '../../notifications/guide-events'
import { platformGuidesRoutes } from '../platform-guides.routes'
import { affiliationsRoutes } from '../affiliations.routes'
import { guidesRoutes } from '../../guides/guides.routes'

const db = prisma as unknown as Record<string, Record<string, Mock>> & { $transaction: Mock }

const app = buildApp(platformGuidesRoutes, affiliationsRoutes, guidesRoutes)
beforeAll(async () => { await app.ready() })
afterAll(async () => { await app.close() })

function token(role: string, sub = 'staff1', tenantId = 't1') {
  return app.jwt.sign({ sub, tenantId, role, name: 'X', approvalStatus: 'APPROVED' })
}
const auth = (role: string, sub?: string, tenantId?: string) => ({
  authorization: `Bearer ${token(role, sub, tenantId)}`,
})

// authenticate revalida o papel da equipe no banco; o resto devolve dados do guia
function mockUsers(staffRole = 'PLATFORM_ADMIN') {
  db.user.findUnique.mockImplementation(async ({ where }: any) =>
    where.id === 'staff1'
      ? { role: staffRole, name: 'Staff' }
      : where.id === 'zz'
        ? null
        : { name: 'Rui', email: 'r@x.com', role: 'CONDUTOR', tenant: { slug: 'independente' } },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  db.user.updateMany.mockResolvedValue({ count: 1 })
  db.$transaction.mockImplementation(async (fn: any) => fn(db))
  mockUsers()
})

describe('GET /platform/guides', () => {
  it('ADMIN -> 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/platform/guides', headers: auth('ADMIN') })
    expect(res.statusCode).toBe(403)
  })

  it('PLATFORM_ADMIN -> 200, sem expor a chave do documento, hasDocument derivado', async () => {
    db.guideProfile.findMany.mockResolvedValue([
      {
        credentialType: 'CADASTUR',
        credentialNumber: '1',
        credentialSubmittedAt: new Date('2026-01-01'),
        credentialDocKey: 'credentials/a.pdf',
        user: { id: 'u1', name: 'Rui', email: 'r@x.com', approvalStatus: 'PENDING', rejectionReason: null },
        affiliation: { status: 'PENDING', tenant: { name: 'Agência' } },
      },
    ])
    const res = await app.inject({ method: 'GET', url: '/platform/guides', headers: auth('PLATFORM_ADMIN', 'staff1') })
    expect(res.statusCode).toBe(200)
    const call = db.guideProfile.findMany.mock.calls[0][0]
    expect(call.where.user.approvalStatus).toBe('PENDING')
    expect(call.orderBy).toEqual({ credentialSubmittedAt: 'asc' })
    const body = res.json()
    expect(JSON.stringify(body)).not.toContain('credentialDocKey')
    expect(JSON.stringify(body)).not.toContain('credentials/a.pdf')
    expect(body.guides[0]).toMatchObject({
      userId: 'u1', hasDocument: true, affiliation: { tenantName: 'Agência', status: 'PENDING' },
    })
  })
})

describe('GET /platform/guides/:userId/credential', () => {
  const url = '/platform/guides/u1/credential'
  beforeEach(() => {
    db.guideProfile.findUnique.mockResolvedValue({ credentialDocKey: 'credentials/a.pdf' })
    ;(getCredential as Mock).mockResolvedValue({ body: Buffer.from('%PDF'), contentType: 'application/pdf' })
  })

  it('sem token -> 401', async () => {
    expect((await app.inject({ method: 'GET', url })).statusCode).toBe(401)
  })
  it('ADMIN -> 403', async () => {
    expect((await app.inject({ method: 'GET', url, headers: auth('ADMIN') })).statusCode).toBe(403)
  })
  it('CONDUTOR -> 403', async () => {
    const res = await app.inject({ method: 'GET', url, headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(403)
    expect(getCredential).not.toHaveBeenCalled()
  })
  it('SUPER_ADMIN -> 200 com cabeçalhos seguros', async () => {
    mockUsers('SUPER_ADMIN')
    const res = await app.inject({ method: 'GET', url, headers: auth('SUPER_ADMIN', 'staff1') })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('application/pdf')
    expect(res.headers['cache-control']).toBe('private, no-store')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['content-disposition']).toBe('inline; filename="comprovante.pdf"')
    expect(getCredential).toHaveBeenCalledWith('credentials/a.pdf')
  })
  it('sem documento -> 404', async () => {
    db.guideProfile.findUnique.mockResolvedValue({ credentialDocKey: null })
    const res = await app.inject({ method: 'GET', url, headers: auth('PLATFORM_ADMIN', 'staff1') })
    expect(res.statusCode).toBe(404)
    expect(res.json().message).toBe('Comprovante não encontrado')
  })
})

describe('PATCH /platform/guides/:userId/approve|reject', () => {
  it('approve atualiza e notifica com o id de quem decidiu', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/platform/guides/u1/approve', headers: auth('PLATFORM_ADMIN', 'staff1') })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Guia aprovado com sucesso' })
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', role: 'CONDUTOR', approvalStatus: 'PENDING' },
      data: { approvalStatus: 'APPROVED', rejectionReason: null },
    })
    expect(notifyGuideDecision).toHaveBeenCalledWith(expect.anything(), 'u1', { approved: true }, 'staff1')
  })

  it('approve por ADMIN -> 403', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/platform/guides/u1/approve', headers: auth('ADMIN') })
    expect(res.statusCode).toBe(403)
    expect(db.user.updateMany).not.toHaveBeenCalled()
  })

  it('approve já decidido (count 0) -> 409 sem notificar', async () => {
    db.user.updateMany.mockResolvedValue({ count: 0 })
    const res = await app.inject({ method: 'PATCH', url: '/platform/guides/u1/approve', headers: auth('PLATFORM_ADMIN', 'staff1') })
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Cadastro já decidido')
    expect(notifyGuideDecision).not.toHaveBeenCalled()
  })

  it('reject já decidido (count 0) -> 409 sem notificar', async () => {
    db.user.updateMany.mockResolvedValue({ count: 0 })
    const res = await app.inject({
      method: 'PATCH', url: '/platform/guides/u1/reject', headers: auth('PLATFORM_ADMIN', 'staff1'),
      payload: { reasonCode: 'VENCIDO' },
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Cadastro já decidido')
    expect(notifyGuideDecision).not.toHaveBeenCalled()
  })

  it('reject VENCIDO grava o rótulo', async () => {
    const res = await app.inject({
      method: 'PATCH', url: '/platform/guides/u1/reject', headers: auth('PLATFORM_ADMIN', 'staff1'),
      payload: { reasonCode: 'VENCIDO' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Guia rejeitado' })
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', role: 'CONDUTOR', approvalStatus: 'PENDING' },
      data: { approvalStatus: 'REJECTED', rejectionReason: 'Documento vencido' },
    })
    expect(notifyGuideDecision).toHaveBeenCalledWith(
      expect.anything(), 'u1', { approved: false, reason: 'Documento vencido' }, 'staff1',
    )
  })

  it('reject OUTRO usa o texto', async () => {
    await app.inject({
      method: 'PATCH', url: '/platform/guides/u1/reject', headers: auth('PLATFORM_ADMIN', 'staff1'),
      payload: { reasonCode: 'OUTRO', text: 'Foto cortada' },
    })
    expect(db.user.updateMany.mock.calls[0][0].data.rejectionReason).toBe('Foto cortada')
  })

  it('reject OUTRO sem texto -> 400', async () => {
    const res = await app.inject({
      method: 'PATCH', url: '/platform/guides/u1/reject', headers: auth('PLATFORM_ADMIN', 'staff1'),
      payload: { reasonCode: 'OUTRO' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('Dados inválidos')
    expect(db.user.updateMany).not.toHaveBeenCalled()
  })

  it('guia inexistente -> 404', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/platform/guides/zz/approve', headers: auth('PLATFORM_ADMIN', 'staff1') })
    expect(res.statusCode).toBe(404)
    expect(db.user.updateMany).not.toHaveBeenCalled()
  })
})

describe('afiliações', () => {
  const pending = { id: 'aff1', tenantId: 't1', status: 'PENDING', guide: { userId: 'u1' } }
  beforeEach(() => {
    db.guideAffiliation.findUnique.mockResolvedValue(pending)
    db.guideAffiliation.updateMany.mockResolvedValue({ count: 1 })
    db.tourPackage.findFirst.mockResolvedValue(null)
  })

  it('accept de guia com roteiros como autônomo -> 409 sem alterar nada', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ id: 'p1' })
    const res = await app.inject({ method: 'PATCH', url: '/affiliations/aff1/accept', headers: auth('ADMIN', 'adm1', 't1') })
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Este guia já tem roteiros como autônomo. Fale com a equipe CAPI para transferir.')
    expect(db.tourPackage.findFirst.mock.calls[0][0].where).toEqual({ conductorId: 'u1', tenant: { slug: 'independente' } })
    expect(db.$transaction).not.toHaveBeenCalled()
    expect(db.user.update).not.toHaveBeenCalled()
    expect(notifyAffiliationDecision).not.toHaveBeenCalled()
  })

  it('accept por ADMIN do tenant certo: transação com update das duas tabelas', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/affiliations/aff1/accept', headers: auth('ADMIN', 'adm1', 't1') })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Vínculo confirmado' })
    expect(db.$transaction).toHaveBeenCalled()
    expect(db.guideAffiliation.updateMany).toHaveBeenCalledWith({ where: { id: 'aff1', status: 'PENDING' }, data: { status: 'ACCEPTED' } })
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { tenantId: 't1' } })
    expect(notifyAffiliationDecision).toHaveBeenCalledWith(expect.anything(), 'aff1', 'adm1')
  })

  it('accept por ADMIN de outro tenant -> 403 sem update', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/affiliations/aff1/accept', headers: auth('ADMIN', 'adm2', 't2') })
    expect(res.statusCode).toBe(403)
    expect(db.guideAffiliation.updateMany).not.toHaveBeenCalled()
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('accept por CONDUTOR -> 403', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/affiliations/aff1/accept', headers: auth('CONDUTOR', 'u1', 't1') })
    expect(res.statusCode).toBe(403)
  })

  it('accept por equipe -> 200', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/affiliations/aff1/accept', headers: auth('PLATFORM_ADMIN', 'staff1', 'x') })
    expect(res.statusCode).toBe(200)
  })

  it('já decidida -> 409', async () => {
    db.guideAffiliation.findUnique.mockResolvedValue({ ...pending, status: 'ACCEPTED' })
    const res = await app.inject({ method: 'PATCH', url: '/affiliations/aff1/accept', headers: auth('ADMIN', 'adm1', 't1') })
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Pedido já decidido')
    expect(db.guideAffiliation.updateMany).not.toHaveBeenCalled()
  })

  it('accept com corrida (updateMany count 0) -> 409 sem user.update nem notificação', async () => {
    db.guideAffiliation.updateMany.mockResolvedValue({ count: 0 })
    const res = await app.inject({ method: 'PATCH', url: '/affiliations/aff1/accept', headers: auth('ADMIN', 'adm1', 't1') })
    expect(res.statusCode).toBe(409)
    expect(db.user.update).not.toHaveBeenCalled()
    expect(notifyAffiliationDecision).not.toHaveBeenCalled()
  })

  it('reject com corrida (count 0) -> 409 sem notificação', async () => {
    db.guideAffiliation.updateMany.mockResolvedValue({ count: 0 })
    const res = await app.inject({
      method: 'PATCH', url: '/affiliations/aff1/reject', headers: auth('ADMIN', 'adm1', 't1'), payload: { reason: 'Não conhecemos' },
    })
    expect(res.statusCode).toBe(409)
    expect(notifyAffiliationDecision).not.toHaveBeenCalled()
  })

  it('reject por ADMIN de outro tenant -> 403', async () => {
    const res = await app.inject({
      method: 'PATCH', url: '/affiliations/aff1/reject', headers: auth('ADMIN', 'adm2', 't2'), payload: { reason: 'Não conhecemos' },
    })
    expect(res.statusCode).toBe(403)
    expect(db.guideAffiliation.updateMany).not.toHaveBeenCalled()
  })

  it('reject em afiliação já decidida -> 409', async () => {
    db.guideAffiliation.findUnique.mockResolvedValue({ ...pending, status: 'REJECTED' })
    const res = await app.inject({
      method: 'PATCH', url: '/affiliations/aff1/reject', headers: auth('ADMIN', 'adm1', 't1'), payload: { reason: 'Não conhecemos' },
    })
    expect(res.statusCode).toBe(409)
    expect(db.guideAffiliation.updateMany).not.toHaveBeenCalled()
  })

  it('inexistente -> 404', async () => {
    db.guideAffiliation.findUnique.mockResolvedValue(null)
    const res = await app.inject({ method: 'PATCH', url: '/affiliations/zz/accept', headers: auth('ADMIN', 'adm1', 't1') })
    expect(res.statusCode).toBe(404)
  })

  it('reject grava o motivo', async () => {
    const res = await app.inject({
      method: 'PATCH', url: '/affiliations/aff1/reject', headers: auth('ADMIN', 'adm1', 't1'),
      payload: { reason: 'Não conhecemos' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Vínculo recusado' })
    expect(db.guideAffiliation.updateMany).toHaveBeenCalledWith({
      where: { id: 'aff1', status: 'PENDING' }, data: { status: 'REJECTED', rejectionReason: 'Não conhecemos' },
    })
    expect(db.user.update).not.toHaveBeenCalled()
    expect(notifyAffiliationDecision).toHaveBeenCalledWith(expect.anything(), 'aff1', 'adm1')
  })

  it('reject com motivo curto -> 400', async () => {
    const res = await app.inject({
      method: 'PATCH', url: '/affiliations/aff1/reject', headers: auth('ADMIN', 'adm1', 't1'), payload: { reason: 'a' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET lista do tenant do slug', async () => {
    db.tenant.findUnique.mockResolvedValue({ id: 't1', slug: 'capivara' })
    db.guideAffiliation.findMany.mockResolvedValue([
      { id: 'aff1', status: 'PENDING', createdAt: new Date('2026-01-01'), guide: { user: { id: 'u1', name: 'Rui', email: 'r@x.com', approvalStatus: 'PENDING' } } },
    ])
    const res = await app.inject({ method: 'GET', url: '/tenants/capivara/admin/affiliations', headers: auth('ADMIN', 'adm1', 't1') })
    expect(res.statusCode).toBe(200)
    expect(db.guideAffiliation.findMany.mock.calls[0][0].where).toEqual({ tenantId: 't1', status: 'PENDING' })
    expect(res.json().affiliations[0]).toMatchObject({ id: 'aff1', guide: { userId: 'u1', name: 'Rui' } })
  })

  it('GET por CONDUTOR -> 403', async () => {
    db.tenant.findUnique.mockResolvedValue({ id: 't1', slug: 'capivara' })
    const res = await app.inject({ method: 'GET', url: '/tenants/capivara/admin/affiliations', headers: auth('CONDUTOR', 'u1', 't1') })
    expect(res.statusCode).toBe(403)
  })
})

describe('rotas antigas de verificação por agência', () => {
  it('PATCH /tenants/capivara/admin/guides/g1/approve -> 404', async () => {
    db.tenant.findUnique.mockResolvedValue({ id: 't1', slug: 'capivara' })
    const res = await app.inject({ method: 'PATCH', url: '/tenants/capivara/admin/guides/g1/approve', headers: auth('ADMIN', 'adm1', 't1') })
    expect(res.statusCode).toBe(404)
  })
})
