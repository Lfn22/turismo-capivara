import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from '../../../__tests__/helpers/build-app'

vi.mock('../../../database', () => ({
  default: {
    user: { findUnique: vi.fn() },
    tourPackage: { findUnique: vi.fn() },
    tenant: { findFirst: vi.fn() },
    packageGuide: { findUnique: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
  },
}))
vi.mock('../future-bookings', () => ({ findGuideFutureBookings: vi.fn() }))
vi.mock('../../bookings/cancel-future-slots', () => ({ cancelFutureSlots: vi.fn() }))
vi.mock('../../notifications/notifications.service', () => ({ resolveAction: vi.fn() }))
vi.mock('../../notifications/guide-events', () => ({
  notifyPackageRequest: vi.fn(),
  notifyPackageDecision: vi.fn(),
  notifyPackageLeft: vi.fn(),
  notifyGuideJoinedPackage: vi.fn(),
}))

import prisma from '../../../database'
import { findGuideFutureBookings } from '../future-bookings'
import { cancelFutureSlots } from '../../bookings/cancel-future-slots'
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
beforeAll(async () => {
  await app.ready()
})
afterAll(async () => {
  await app.close()
})

const auth = (role: string, over: Record<string, string> = {}) => ({
  authorization: `Bearer ${app.jwt.sign({ sub: 'u1', tenantId: 't1', role, name: 'X', approvalStatus: 'APPROVED', ...over })}`,
})

const agencyPkg = {
  id: 'p1',
  name: 'Trilha',
  tenantId: 't1',
  conductorId: 'c1',
  active: true,
  publishedAt: new Date('2026-01-01'),
  destinationId: null,
  tenant: { slug: 'capivara', name: 'Capivara Tur', destinationId: 'd1' },
  conductor: { name: 'Cond', role: 'ADMIN' },
}

beforeEach(() => {
  vi.resetAllMocks()
  for (const f of [
    notifyPackageRequest,
    notifyPackageDecision,
    notifyPackageLeft,
    notifyGuideJoinedPackage,
    resolveAction,
  ]) {
    ;(f as Mock).mockResolvedValue(undefined)
  }
  db.tourPackage.findUnique.mockResolvedValue(agencyPkg)
  db.user.findUnique.mockResolvedValue({
    name: 'Rui',
    approvalStatus: 'APPROVED',
    guideProfile: { id: 'gp1' },
  })
  db.packageGuide.findUnique.mockResolvedValue(null)
  db.packageGuide.updateMany.mockResolvedValue({ count: 1 })
  db.packageGuide.upsert.mockResolvedValue({ id: 'pg1' })
  future.mockResolvedValue([])
})

describe('canDecidePackageRequest', () => {
  // Criado por ADMIN (conductor é o próprio ADMIN) ou pela equipe (sem conductor)
  const byAdmin = {
    tenantId: 't1',
    destinationId: null,
    tenant: { destinationId: 't1-dest' },
    conductor: { role: 'ADMIN' },
  }
  const byStaff = {
    tenantId: 't1',
    destinationId: null,
    tenant: { destinationId: 't1-dest' },
    conductor: null,
  }
  // Criado por guia: quem decide é o "dono" do destino
  const byGuide = {
    tenantId: 't9',
    destinationId: null,
    tenant: { destinationId: 'd1' },
    conductor: { role: 'CONDUTOR' },
  }

  it('roteiro de ADMIN/equipe: ADMIN do tenant dono decide', async () => {
    expect(
      await canDecidePackageRequest({ sub: 'a', role: 'ADMIN', tenantId: 't1' }, byAdmin),
    ).toBe(true)
    expect(
      await canDecidePackageRequest({ sub: 'a', role: 'ADMIN', tenantId: 't1' }, byStaff),
    ).toBe(true)
  })
  it('roteiro de ADMIN: ADMIN de outro tenant não decide, nem sendo dono do destino', async () => {
    db.tenant.findFirst.mockResolvedValue({ id: 't2' })
    expect(
      await canDecidePackageRequest({ sub: 'a', role: 'ADMIN', tenantId: 't2' }, byAdmin),
    ).toBe(false)
  })
  it('roteiro de guia: ADMIN do destino decide', async () => {
    db.tenant.findFirst.mockResolvedValue({ id: 't2' })
    expect(
      await canDecidePackageRequest({ sub: 'a', role: 'ADMIN', tenantId: 't2' }, byGuide),
    ).toBe(true)
    expect(db.tenant.findFirst).toHaveBeenCalledWith({
      where: { id: 't2', destinationId: 'd1' },
      select: { id: true },
    })
  })
  it('roteiro de guia: ADMIN sem relação com o destino não decide', async () => {
    db.tenant.findFirst.mockResolvedValue(null)
    expect(
      await canDecidePackageRequest({ sub: 'a', role: 'ADMIN', tenantId: 't3' }, byGuide),
    ).toBe(false)
  })
  it('roteiro de guia: o próprio guia criador não decide', async () => {
    expect(
      await canDecidePackageRequest({ sub: 'u1', role: 'CONDUTOR', tenantId: 't9' }, byGuide),
    ).toBe(false)
  })
  it('roteiro de guia com destino próprio: vale o destino do roteiro, não o do tenant', async () => {
    db.tenant.findFirst.mockResolvedValue({ id: 't2' })
    const own = { ...byGuide, destinationId: 'd-own' }
    expect(await canDecidePackageRequest({ sub: 'a', role: 'ADMIN', tenantId: 't2' }, own)).toBe(
      true,
    )
    expect(db.tenant.findFirst.mock.calls[0][0].where).toEqual({ id: 't2', destinationId: 'd-own' })
  })
  it('roteiro de guia sem destino: só a equipe', async () => {
    const noDest = { ...byGuide, tenant: { destinationId: null } }
    expect(await canDecidePackageRequest({ sub: 'a', role: 'ADMIN', tenantId: 't9' }, noDest)).toBe(
      false,
    )
    expect(
      await canDecidePackageRequest({ sub: 'x', role: 'PLATFORM_ADMIN', tenantId: 'tx' }, noDest),
    ).toBe(true)
  })
  it('equipe CAPI decide sempre', async () => {
    for (const pkg of [byAdmin, byStaff, byGuide]) {
      expect(
        await canDecidePackageRequest({ sub: 'x', role: 'PLATFORM_ADMIN', tenantId: 'tx' }, pkg),
      ).toBe(true)
    }
  })
})

describe('GET membership', () => {
  const get = (headers: Record<string, string>) =>
    app.inject({ method: 'GET', url: '/packages/p1/membership', headers })

  it('NOT_GUIDE para CLIENTE', async () => {
    const res = await get(auth('CLIENTE'))
    expect(res.json()).toMatchObject({
      state: 'NOT_GUIDE',
      ownerName: 'Capivara Tur',
      bookings: [],
    })
  })
  it('ownerName é o condutor em tenant independente', async () => {
    db.tourPackage.findUnique.mockResolvedValue({
      ...agencyPkg,
      tenant: { slug: 'independente', name: 'Independente' },
    })
    const res = await get(auth('CLIENTE'))
    expect(res.json().ownerName).toBe('Cond')
  })
  it('CONDUTOR quando é o condutor do roteiro', async () => {
    const res = await get(auth('CONDUTOR', { sub: 'c1' }))
    expect(res.json().state).toBe('CONDUCTOR')
  })
  it('UNVERIFIED para guia não aprovado', async () => {
    db.user.findUnique.mockResolvedValue({
      name: 'Rui',
      approvalStatus: 'PENDING',
      guideProfile: { id: 'gp1' },
    })
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
    db.packageGuide.findUnique.mockResolvedValue({
      status: 'REJECTED',
      rejectionReason: 'Sem vaga',
    })
    expect((await get(auth('CONDUTOR'))).json()).toMatchObject({
      state: 'REJECTED',
      rejectionReason: 'Sem vaga',
    })
  })
  it('IN e IN_WITH_BOOKINGS', async () => {
    db.packageGuide.findUnique.mockResolvedValue({ status: 'ACCEPTED', rejectionReason: null })
    let res = await get(auth('CONDUTOR'))
    expect(res.json().state).toBe('IN')
    future.mockResolvedValue([
      {
        id: 'b1',
        startsAt: new Date('2030-01-01T10:00:00Z'),
        packageName: 'Trilha',
        status: 'CONFIRMED',
      },
    ])
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
  const post = () =>
    app.inject({ method: 'POST', url: '/packages/p1/guides/me', headers: auth('CONDUTOR') })

  it('roteiro inativo -> 404 sem upsert', async () => {
    db.tourPackage.findUnique.mockResolvedValue({ ...agencyPkg, active: false })
    const res = await post()
    expect(res.statusCode).toBe(404)
    expect(res.json().message).toBe('Roteiro não encontrado')
    expect(db.packageGuide.upsert).not.toHaveBeenCalled()
  })

  it('guia PENDING -> 403 sem upsert', async () => {
    db.user.findUnique.mockResolvedValue({
      name: 'Rui',
      approvalStatus: 'PENDING',
      guideProfile: { id: 'gp1' },
    })
    const res = await post()
    expect(res.statusCode).toBe(403)
    expect(res.json().message).toBe('Disponível após verificação')
    expect(db.packageGuide.upsert).not.toHaveBeenCalled()
  })
  it('CLIENTE -> 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/packages/p1/guides/me',
      headers: auth('CLIENTE'),
    })
    expect(res.statusCode).toBe(403)
  })
  it('condutor do roteiro -> 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/packages/p1/guides/me',
      headers: auth('CONDUTOR', { sub: 'c1' }),
    })
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
  const pg = {
    id: 'pg1',
    packageId: 'p1',
    status: 'PENDING',
    guide: { userId: 'g1', user: { approvalStatus: 'APPROVED' } },
  }
  const accept = (headers = auth('ADMIN')) =>
    app.inject({ method: 'PATCH', url: '/packages/p1/guide-requests/pg1/accept', headers })
  const reject = (payload: unknown, headers = auth('ADMIN')) =>
    app.inject({
      method: 'PATCH',
      url: '/packages/p1/guide-requests/pg1/reject',
      headers,
      payload: payload as object,
    })

  beforeEach(() => {
    db.packageGuide.findUnique.mockResolvedValue(pg)
  })

  it('accept exige guia verificado no filtro do updateMany', async () => {
    await accept()
    expect(db.packageGuide.updateMany.mock.calls[0][0].where).toMatchObject({
      guide: { user: { approvalStatus: 'APPROVED' } },
    })
  })
  it('accept com guia não verificado -> 409 sem update', async () => {
    db.packageGuide.findUnique.mockResolvedValue({
      ...pg,
      guide: { userId: 'g1', user: { approvalStatus: 'PENDING' } },
    })
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
    expect(arg.where).toEqual({
      id: 'pg1',
      status: 'PENDING',
      guide: { user: { approvalStatus: 'APPROVED' } },
    })
    expect(arg.data).toMatchObject({ status: 'ACCEPTED' })
    expect(arg.data.decidedAt).toBeInstanceOf(Date)
    expect(notifyPackageDecision).toHaveBeenCalledWith(expect.anything(), 'pg1', 'u1')
    expect(notifyGuideJoinedPackage).toHaveBeenCalledWith(expect.anything(), 'g1', 'p1')
  })
  it('roteiro criado por guia: ADMIN do destino (outro tenant) aceita', async () => {
    db.tourPackage.findUnique.mockResolvedValue({
      ...agencyPkg,
      tenantId: 't9',
      conductor: { name: 'Cond', role: 'CONDUTOR' },
    })
    db.tenant.findFirst.mockResolvedValue({ id: 't2' })
    const res = await accept(auth('ADMIN', { tenantId: 't2' }))
    expect(res.statusCode).toBe(200)
    expect(db.packageGuide.updateMany).toHaveBeenCalled()
  })
  it('roteiro criado por guia: o próprio guia criador -> 403', async () => {
    db.tourPackage.findUnique.mockResolvedValue({
      ...agencyPkg,
      tenantId: 't9',
      conductorId: 'u1',
      tenant: { slug: 'independente', name: 'Independente' },
      conductor: { name: 'Cond', role: 'CONDUTOR' },
    })
    const res = await accept(auth('CONDUTOR', { tenantId: 't9' }))
    expect(res.statusCode).toBe(403)
    expect(db.packageGuide.updateMany).not.toHaveBeenCalled()
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
    expect(db.packageGuide.updateMany.mock.calls[0][0].data).toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'Sem vaga',
    })
    expect(notifyPackageDecision).toHaveBeenCalled()
    expect(notifyGuideJoinedPackage).not.toHaveBeenCalled()
  })
})

describe('DELETE guides/me', () => {
  const del = () =>
    app.inject({ method: 'DELETE', url: '/packages/p1/guides/me', headers: auth('CONDUTOR') })

  it('PENDING -> LEFT, resolve a pendência com o nome do guia', async () => {
    db.packageGuide.findUnique.mockResolvedValue({ id: 'pg1', status: 'PENDING' })
    const res = await del()
    expect(res.statusCode).toBe(204)
    expect(db.packageGuide.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 'pg1', status: 'PENDING' },
      data: { status: 'LEFT' },
    })
    expect(resolveAction).toHaveBeenCalledWith('package-request:pg1', 'Rui')
    expect(notifyPackageLeft).not.toHaveBeenCalled()
  })
  it('ACCEPTED com reserva futura -> cancela e estorna as datas do guia neste roteiro, sai (204)', async () => {
    db.packageGuide.findUnique.mockResolvedValue({ id: 'pg1', status: 'ACCEPTED' })
    ;(cancelFutureSlots as Mock).mockResolvedValue({ slotsCancelled: 1, bookingsCancelled: 1 })
    const res = await del()
    expect(res.statusCode).toBe(204)
    expect(cancelFutureSlots).toHaveBeenCalledWith(
      { packageId: 'p1', guideId: 'gp1' },
      expect.anything(),
    )
    expect(db.packageGuide.updateMany.mock.calls[0][0]).toMatchObject({ data: { status: 'LEFT' } })
  })
  it('estorno falhou -> erro e o guia continua no roteiro', async () => {
    db.packageGuide.findUnique.mockResolvedValue({ id: 'pg1', status: 'ACCEPTED' })
    ;(cancelFutureSlots as Mock).mockRejectedValue(
      Object.assign(new Error('x'), { statusCode: 502 }),
    )
    const res = await del()
    expect(res.statusCode).toBeGreaterThanOrEqual(500)
    expect(db.packageGuide.updateMany).not.toHaveBeenCalled()
  })
  it('ACCEPTED sem reserva -> LEFT, 204 e notifica', async () => {
    db.packageGuide.findUnique.mockResolvedValue({ id: 'pg1', status: 'ACCEPTED' })
    const res = await del()
    expect(res.statusCode).toBe(204)
    expect(db.packageGuide.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 'pg1', status: 'ACCEPTED' },
      data: { status: 'LEFT' },
    })
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
