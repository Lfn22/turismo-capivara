import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from '../../../__tests__/helpers/build-app'

vi.mock('../../../database', () => ({
  default: {
    user: { findUnique: vi.fn() },
    tourPackage: { findUnique: vi.fn() },
    packageGuide: { findUnique: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
  },
}))
vi.mock('../future-bookings', () => ({ findGuideFutureBookings: vi.fn() }))
vi.mock('../../notifications/notifications.service', () => ({ resolveAction: vi.fn() }))
vi.mock('../../notifications/guide-events', () => ({
  notifyPackageRequest: vi.fn(),
  notifyPackageDecision: vi.fn(),
  notifyPackageLeft: vi.fn(),
  notifyGuideJoinedPackage: vi.fn(),
}))

import prisma from '../../../database'
import { findGuideFutureBookings } from '../future-bookings'
import { resolveAction } from '../../notifications/notifications.service'
import {
  notifyPackageRequest,
  notifyPackageDecision,
  notifyPackageLeft,
  notifyGuideJoinedPackage,
} from '../../notifications/guide-events'
import { packageMembershipRoutes, canDecidePackageRequest } from '../package-membership.routes'

const db = prisma as unknown as Record<string, Record<string, Mock>>
const future = findGuideFutureBookings as Mock

const app = buildApp(packageMembershipRoutes)
beforeAll(async () => { await app.ready() })
afterAll(async () => { await app.close() })

const auth = (role: string, over: Record<string, string> = {}) => ({
  authorization: `Bearer ${app.jwt.sign({ sub: 'u1', tenantId: 't1', role, name: 'X', approvalStatus: 'APPROVED', ...over })}`,
})

const agencyPkg = {
  id: 'p1', name: 'Trilha', tenantId: 't1', conductorId: 'c1', active: true, publishedAt: new Date('2026-01-01'),
  tenant: { slug: 'capivara', name: 'Capivara Tur' }, conductor: { name: 'Cond' },
}

beforeEach(() => {
  vi.resetAllMocks()
  for (const f of [notifyPackageRequest, notifyPackageDecision, notifyPackageLeft, notifyGuideJoinedPackage, resolveAction]) {
    ;(f as Mock).mockResolvedValue(undefined)
  }
  db.tourPackage.findUnique.mockResolvedValue(agencyPkg)
  db.user.findUnique.mockResolvedValue({ name: 'Rui', approvalStatus: 'APPROVED', guideProfile: { id: 'gp1' } })
  db.packageGuide.findUnique.mockResolvedValue(null)
  db.packageGuide.updateMany.mockResolvedValue({ count: 1 })
  db.packageGuide.upsert.mockResolvedValue({ id: 'pg1' })
  future.mockResolvedValue([])
})

describe('canDecidePackageRequest', () => {
  const indep = { tenantId: 't9', conductorId: 'u1', tenant: { slug: 'independente' } }
  const agency = { tenantId: 't1', conductorId: 'u1', tenant: { slug: 'capivara' } }
  it('ADMIN do mesmo tenant', () => {
    expect(canDecidePackageRequest({ sub: 'a', role: 'ADMIN', tenantId: 't1' }, agency)).toBe(true)
  })
  it('ADMIN de outro tenant', () => {
    expect(canDecidePackageRequest({ sub: 'a', role: 'ADMIN', tenantId: 't2' }, agency)).toBe(false)
  })
  it('CONDUTOR condutor de roteiro independente', () => {
    expect(canDecidePackageRequest({ sub: 'u1', role: 'CONDUTOR', tenantId: 't9' }, indep)).toBe(true)
  })
  it('CONDUTOR condutor de roteiro de agência', () => {
    expect(canDecidePackageRequest({ sub: 'u1', role: 'CONDUTOR', tenantId: 't1' }, agency)).toBe(false)
  })
  it('PLATFORM_ADMIN', () => {
    expect(canDecidePackageRequest({ sub: 'x', role: 'PLATFORM_ADMIN', tenantId: 'tx' }, agency)).toBe(true)
  })
})

describe('GET membership', () => {
  const get = (headers: Record<string, string>) =>
    app.inject({ method: 'GET', url: '/packages/p1/membership', headers })

  it('NOT_GUIDE para CLIENTE', async () => {
    const res = await get(auth('CLIENTE'))
    expect(res.json()).toMatchObject({ state: 'NOT_GUIDE', ownerName: 'Capivara Tur', bookings: [] })
  })
  it('ownerName é o condutor em tenant independente', async () => {
    db.tourPackage.findUnique.mockResolvedValue({ ...agencyPkg, tenant: { slug: 'independente', name: 'Independente' } })
    const res = await get(auth('CLIENTE'))
    expect(res.json().ownerName).toBe('Cond')
  })
  it('CONDUTOR quando é o condutor do roteiro', async () => {
    const res = await get(auth('CONDUTOR', { sub: 'c1' }))
    expect(res.json().state).toBe('CONDUCTOR')
  })
  it('UNVERIFIED para guia não aprovado', async () => {
    db.user.findUnique.mockResolvedValue({ name: 'Rui', approvalStatus: 'PENDING', guideProfile: { id: 'gp1' } })
    const res = await get(auth('CONDUTOR'))
    expect(res.json().state).toBe('UNVERIFIED')
  })
  it('OUT sem vínculo e para LEFT', async () => {
    let res = await get(auth('CONDUTOR'))
    expect(res.json().state).toBe('OUT')
    db.packageGuide.findUnique.mockResolvedValue({ status: 'LEFT', rejectionReason: null })
    res = await get(auth('CONDUTOR'))
    expect(res.json().state).toBe('OUT')
  })
  it('PENDING e REJECTED com motivo', async () => {
    db.packageGuide.findUnique.mockResolvedValue({ status: 'PENDING', rejectionReason: null })
    expect((await get(auth('CONDUTOR'))).json().state).toBe('PENDING')
    db.packageGuide.findUnique.mockResolvedValue({ status: 'REJECTED', rejectionReason: 'Sem vaga' })
    expect((await get(auth('CONDUTOR'))).json()).toMatchObject({ state: 'REJECTED', rejectionReason: 'Sem vaga' })
  })
  it('IN e IN_WITH_BOOKINGS', async () => {
    db.packageGuide.findUnique.mockResolvedValue({ status: 'ACCEPTED', rejectionReason: null })
    let res = await get(auth('CONDUTOR'))
    expect(res.json().state).toBe('IN')
    future.mockResolvedValue([{ id: 'b1', startsAt: new Date('2030-01-01T10:00:00Z'), packageName: 'Trilha', status: 'CONFIRMED' }])
    res = await get(auth('CONDUTOR'))
    expect(res.json()).toMatchObject({
      state: 'IN_WITH_BOOKINGS',
      bookings: [{ id: 'b1', startsAt: '2030-01-01T10:00:00.000Z', packageName: 'Trilha' }],
    })
  })
  it('roteiro inexistente -> 404', async () => {
    db.tourPackage.findUnique.mockResolvedValue(null)
    const res = await get(auth('CONDUTOR'))
    expect(res.statusCode).toBe(404)
  })
})

describe('POST guides/me', () => {
  const post = () => app.inject({ method: 'POST', url: '/packages/p1/guides/me', headers: auth('CONDUTOR') })

  it('roteiro inativo -> 404 sem upsert', async () => {
    db.tourPackage.findUnique.mockResolvedValue({ ...agencyPkg, active: false })
    const res = await post()
    expect(res.statusCode).toBe(404)
    expect(res.json().message).toBe('Roteiro não encontrado')
    expect(db.packageGuide.upsert).not.toHaveBeenCalled()
  })

  it('guia PENDING -> 403 sem upsert', async () => {
    db.user.findUnique.mockResolvedValue({ name: 'Rui', approvalStatus: 'PENDING', guideProfile: { id: 'gp1' } })
    const res = await post()
    expect(res.statusCode).toBe(403)
    expect(res.json().message).toBe('Disponível após verificação')
    expect(db.packageGuide.upsert).not.toHaveBeenCalled()
  })
  it('CLIENTE -> 403', async () => {
    const res = await app.inject({ method: 'POST', url: '/packages/p1/guides/me', headers: auth('CLIENTE') })
    expect(res.statusCode).toBe(403)
  })
  it('condutor do roteiro -> 409', async () => {
    const res = await app.inject({ method: 'POST', url: '/packages/p1/guides/me', headers: auth('CONDUTOR', { sub: 'c1' }) })
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Você é o guia responsável por este roteiro')
  })
  it('pedido já PENDING -> 200 sem upsert nem notificação', async () => {
    db.packageGuide.findUnique.mockResolvedValue({ status: 'PENDING' })
    const res = await post()
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ state: 'PENDING' })
    expect(db.packageGuide.upsert).not.toHaveBeenCalled()
    expect(notifyPackageRequest).not.toHaveBeenCalled()
  })
  it('já ACCEPTED -> 200 IN sem mudar nada', async () => {
    db.packageGuide.findUnique.mockResolvedValue({ status: 'ACCEPTED' })
    const res = await post()
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ state: 'IN' })
    expect(db.packageGuide.upsert).not.toHaveBeenCalled()
  })
  it('após REJECTED -> upsert PENDING, 201 e notifica', async () => {
    db.packageGuide.findUnique.mockResolvedValue({ status: 'REJECTED' })
    const res = await post()
    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({ state: 'PENDING' })
    const arg = db.packageGuide.upsert.mock.calls[0][0]
    expect(arg.update).toMatchObject({ status: 'PENDING', rejectionReason: null, decidedAt: null })
    expect(arg.create).toMatchObject({ packageId: 'p1', guideId: 'gp1', status: 'PENDING' })
    expect(notifyPackageRequest).toHaveBeenCalledWith(expect.anything(), 'pg1')
  })
})

describe('PATCH guide-requests', () => {
  const pg = { id: 'pg1', packageId: 'p1', status: 'PENDING', guide: { userId: 'g1', user: { approvalStatus: 'APPROVED' } } }
  const accept = (headers = auth('ADMIN')) =>
    app.inject({ method: 'PATCH', url: '/packages/p1/guide-requests/pg1/accept', headers })
  const reject = (payload: unknown, headers = auth('ADMIN')) =>
    app.inject({ method: 'PATCH', url: '/packages/p1/guide-requests/pg1/reject', headers, payload: payload as object })

  beforeEach(() => { db.packageGuide.findUnique.mockResolvedValue(pg) })

  it('accept exige guia verificado no filtro do updateMany', async () => {
    await accept()
    expect(db.packageGuide.updateMany.mock.calls[0][0].where).toMatchObject({
      guide: { user: { approvalStatus: 'APPROVED' } },
    })
  })
  it('accept com guia não verificado -> 409 sem update', async () => {
    db.packageGuide.findUnique.mockResolvedValue({ ...pg, guide: { userId: 'g1', user: { approvalStatus: 'PENDING' } } })
    const res = await accept()
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Guia não está verificado')
    expect(db.packageGuide.updateMany).not.toHaveBeenCalled()
  })

  it('ADMIN de outro tenant -> 403 sem update', async () => {
    const res = await accept(auth('ADMIN', { tenantId: 't2' }))
    expect(res.statusCode).toBe(403)
    expect(res.json().message).toBe('Acesso negado')
    expect(db.packageGuide.updateMany).not.toHaveBeenCalled()
  })
  it('dono aceita -> ACCEPTED e notifica', async () => {
    const res = await accept()
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Pedido aceito' })
    const arg = db.packageGuide.updateMany.mock.calls[0][0]
    expect(arg.where).toEqual({ id: 'pg1', status: 'PENDING', guide: { user: { approvalStatus: 'APPROVED' } } })
    expect(arg.data).toMatchObject({ status: 'ACCEPTED' })
    expect(arg.data.decidedAt).toBeInstanceOf(Date)
    expect(notifyPackageDecision).toHaveBeenCalledWith(expect.anything(), 'pg1', 'u1')
    expect(notifyGuideJoinedPackage).toHaveBeenCalledWith(expect.anything(), 'g1', 'p1')
  })
  it('já decidido -> 409 sem notificar', async () => {
    db.packageGuide.updateMany.mockResolvedValue({ count: 0 })
    const res = await accept()
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Pedido já decidido')
    expect(notifyPackageDecision).not.toHaveBeenCalled()
  })
  it('403 vem antes do 409', async () => {
    db.packageGuide.findUnique.mockResolvedValue({ ...pg, status: 'ACCEPTED' })
    const res = await accept(auth('ADMIN', { tenantId: 't2' }))
    expect(res.statusCode).toBe(403)
  })
  it('pedido de outro roteiro -> 404', async () => {
    db.packageGuide.findUnique.mockResolvedValue({ ...pg, packageId: 'outro' })
    const res = await accept()
    expect(res.statusCode).toBe(404)
  })
  it('reject sem reason -> 400', async () => {
    const res = await reject({})
    expect(res.statusCode).toBe(400)
    expect(db.packageGuide.updateMany).not.toHaveBeenCalled()
  })
  it('reject com reason curto -> 400', async () => {
    expect((await reject({ reason: 'ab' })).statusCode).toBe(400)
  })
  it('reject -> REJECTED com motivo', async () => {
    const res = await reject({ reason: 'Sem vaga' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Pedido recusado' })
    expect(db.packageGuide.updateMany.mock.calls[0][0].data).toMatchObject({ status: 'REJECTED', rejectionReason: 'Sem vaga' })
    expect(notifyPackageDecision).toHaveBeenCalled()
    expect(notifyGuideJoinedPackage).not.toHaveBeenCalled()
  })
})

describe('DELETE guides/me', () => {
  const del = () => app.inject({ method: 'DELETE', url: '/packages/p1/guides/me', headers: auth('CONDUTOR') })

  it('PENDING -> LEFT, resolve a pendência com o nome do guia', async () => {
    db.packageGuide.findUnique.mockResolvedValue({ id: 'pg1', status: 'PENDING' })
    const res = await del()
    expect(res.statusCode).toBe(204)
    expect(db.packageGuide.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: 'pg1', status: 'PENDING' }, data: { status: 'LEFT' } })
    expect(resolveAction).toHaveBeenCalledWith('package-request:pg1', 'Rui')
    expect(notifyPackageLeft).not.toHaveBeenCalled()
  })
  it('ACCEPTED com reserva futura -> 409', async () => {
    db.packageGuide.findUnique.mockResolvedValue({ id: 'pg1', status: 'ACCEPTED' })
    future.mockResolvedValue([{ id: 'b1', startsAt: new Date('2030-01-01T10:00:00Z'), packageName: 'Trilha', status: 'CONFIRMED' }])
    const res = await del()
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Você tem reservas pendentes, fale com o admin')
    expect(res.json().bookings).toHaveLength(1)
    expect(db.packageGuide.updateMany).not.toHaveBeenCalled()
    expect(future).toHaveBeenCalledWith({ userId: 'u1', guideProfileId: 'gp1', packageId: 'p1' })
  })
  it('ACCEPTED sem reserva -> LEFT, 204 e notifica', async () => {
    db.packageGuide.findUnique.mockResolvedValue({ id: 'pg1', status: 'ACCEPTED' })
    const res = await del()
    expect(res.statusCode).toBe(204)
    expect(db.packageGuide.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: 'pg1', status: 'ACCEPTED' }, data: { status: 'LEFT' } })
    expect(notifyPackageLeft).toHaveBeenCalledWith(expect.anything(), 'pg1')
  })
  it('segunda chamada concorrente (count 0) -> 204 sem notificar', async () => {
    db.packageGuide.findUnique.mockResolvedValue({ id: 'pg1', status: 'ACCEPTED' })
    db.packageGuide.updateMany.mockResolvedValue({ count: 0 })
    const res = await del()
    expect(res.statusCode).toBe(204)
    expect(notifyPackageLeft).not.toHaveBeenCalled()
  })
  it('sem vínculo, REJECTED ou LEFT -> 204 sem alterar', async () => {
    expect((await del()).statusCode).toBe(204)
    db.packageGuide.findUnique.mockResolvedValue({ id: 'pg1', status: 'REJECTED' })
    expect((await del()).statusCode).toBe(204)
    expect(db.packageGuide.updateMany).not.toHaveBeenCalled()
  })
})
