import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from '../../../__tests__/helpers/build-app'

vi.mock('../../../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    destination: { findFirst: vi.fn(), findUnique: vi.fn() },
    guideDestination: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
  },
}))
vi.mock('../future-bookings', () => ({ findGuideFutureBookings: vi.fn() }))
vi.mock('../../notifications/guide-events', () => ({
  notifyDestinationMembership: vi.fn().mockResolvedValue(undefined),
}))

import prisma from '../../../database'
import { findGuideFutureBookings } from '../future-bookings'
import { notifyDestinationMembership } from '../../notifications/guide-events'
import { destinationMembershipRoutes } from '../destination-membership.routes'

const db = prisma as unknown as Record<string, Record<string, Mock>>
const future = findGuideFutureBookings as Mock

const app = buildApp(destinationMembershipRoutes)
beforeAll(async () => { await app.ready() })
afterAll(async () => { await app.close() })

const auth = (role: string) => ({
  authorization: `Bearer ${app.jwt.sign({ sub: 'u1', tenantId: 't1', role, name: 'X', approvalStatus: 'APPROVED' })}`,
})
const URL_ME = '/destinations/serra-azul/guides/me'
const URL_MEMBERSHIP = '/destinations/serra-azul/membership'

function mockGuide(approvalStatus: string, profile: { id: string } | null = { id: 'gp1' }) {
  db.user.findUnique.mockResolvedValue({ approvalStatus, guideProfile: profile })
}

beforeEach(() => {
  vi.resetAllMocks()
  ;(notifyDestinationMembership as Mock).mockResolvedValue(undefined)
  db.destination.findFirst.mockResolvedValue({ id: 'd1' })
  db.guideDestination.findUnique.mockResolvedValue(null)
  future.mockResolvedValue([])
})

describe('rotas com slug de destino que não é slug de tenant', () => {
  it('authenticate não trata o parâmetro como tenant (tenant.findUnique nunca é chamado)', async () => {
    db.tenant.findUnique.mockResolvedValue(null)
    mockGuide('APPROVED')
    const res = await app.inject({ method: 'GET', url: URL_MEMBERSHIP, headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(200)
    expect(db.tenant.findUnique).not.toHaveBeenCalled()
  })
})

describe('GET membership', () => {
  it('destino inexistente ou não aprovado -> 404', async () => {
    db.destination.findFirst.mockResolvedValue(null)
    const res = await app.inject({ method: 'GET', url: URL_MEMBERSHIP, headers: auth('CLIENTE') })
    expect(res.statusCode).toBe(404)
    expect(res.json().message).toBe('Destino não encontrado')
    expect(db.destination.findFirst.mock.calls[0][0].where).toMatchObject({
      slug: 'serra-azul',
      approvalStatus: 'APPROVED',
      active: true,
    })
  })

  it('NOT_GUIDE para papel que não é CONDUTOR', async () => {
    const res = await app.inject({ method: 'GET', url: URL_MEMBERSHIP, headers: auth('CLIENTE') })
    expect(res.json()).toEqual({ state: 'NOT_GUIDE', bookings: [] })
  })

  it('UNVERIFIED para guia não aprovado', async () => {
    mockGuide('PENDING')
    const res = await app.inject({ method: 'GET', url: URL_MEMBERSHIP, headers: auth('CONDUTOR') })
    expect(res.json()).toEqual({ state: 'UNVERIFIED', bookings: [] })
  })

  it('OUT para guia aprovado sem vínculo', async () => {
    mockGuide('APPROVED')
    const res = await app.inject({ method: 'GET', url: URL_MEMBERSHIP, headers: auth('CONDUTOR') })
    expect(res.json()).toEqual({ state: 'OUT', bookings: [] })
  })

  it('IN para guia vinculado sem reservas futuras', async () => {
    mockGuide('APPROVED')
    db.guideDestination.findUnique.mockResolvedValue({ id: 'gd1' })
    const res = await app.inject({ method: 'GET', url: URL_MEMBERSHIP, headers: auth('CONDUTOR') })
    expect(res.json()).toEqual({ state: 'IN', bookings: [] })
    expect(future).toHaveBeenCalledWith({ userId: 'u1', guideProfileId: 'gp1', destinationId: 'd1' })
  })

  it('IN_WITH_BOOKINGS com a lista de reservas', async () => {
    mockGuide('APPROVED')
    db.guideDestination.findUnique.mockResolvedValue({ id: 'gd1' })
    future.mockResolvedValue([
      { id: 'b1', startsAt: new Date('2026-12-01T10:00:00Z'), packageName: 'Trilha', status: 'CONFIRMED' },
    ])
    const res = await app.inject({ method: 'GET', url: URL_MEMBERSHIP, headers: auth('CONDUTOR') })
    expect(res.json()).toEqual({
      state: 'IN_WITH_BOOKINGS',
      bookings: [{ id: 'b1', startsAt: '2026-12-01T10:00:00.000Z', packageName: 'Trilha' }],
    })
  })

  it('sem token -> 401', async () => {
    const res = await app.inject({ method: 'GET', url: URL_MEMBERSHIP })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST guides/me', () => {
  it('guia PENDING -> 403 e nada é criado', async () => {
    mockGuide('PENDING')
    const res = await app.inject({ method: 'POST', url: URL_ME, headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(403)
    expect(res.json().message).toBe('Disponível após verificação')
    expect(db.guideDestination.create).not.toHaveBeenCalled()
    expect(notifyDestinationMembership).not.toHaveBeenCalled()
  })

  it('CLIENTE -> 403 e nada é criado', async () => {
    const res = await app.inject({ method: 'POST', url: URL_ME, headers: auth('CLIENTE') })
    expect(res.statusCode).toBe(403)
    expect(db.guideDestination.create).not.toHaveBeenCalled()
  })

  it('guia aprovado -> 201, cria e notifica joined', async () => {
    mockGuide('APPROVED')
    db.guideDestination.create.mockResolvedValue({})
    const res = await app.inject({ method: 'POST', url: URL_ME, headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({ state: 'IN' })
    expect(db.guideDestination.create).toHaveBeenCalledWith({ data: { guideId: 'gp1', destinationId: 'd1' } })
    expect(notifyDestinationMembership).toHaveBeenCalledWith(expect.anything(), 'u1', 'd1', 'joined')
  })

  it('já dentro -> 200, sem create e sem notificar', async () => {
    mockGuide('APPROVED')
    db.guideDestination.findUnique.mockResolvedValue({ id: 'gd1' })
    const res = await app.inject({ method: 'POST', url: URL_ME, headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ state: 'IN' })
    expect(db.guideDestination.create).not.toHaveBeenCalled()
    expect(notifyDestinationMembership).not.toHaveBeenCalled()
  })

  it('corrida (P2002 no create) -> 200', async () => {
    mockGuide('APPROVED')
    db.guideDestination.create.mockRejectedValue({ code: 'P2002' })
    const res = await app.inject({ method: 'POST', url: URL_ME, headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(200)
    expect(notifyDestinationMembership).not.toHaveBeenCalled()
  })

  it('destino inexistente -> 404', async () => {
    db.destination.findFirst.mockResolvedValue(null)
    const res = await app.inject({ method: 'POST', url: URL_ME, headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE guides/me', () => {
  it('fora do destino -> 204 sem delete', async () => {
    mockGuide('APPROVED')
    const res = await app.inject({ method: 'DELETE', url: URL_ME, headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(204)
    expect(db.guideDestination.deleteMany).not.toHaveBeenCalled()
  })

  it('com reserva futura -> 409 com mensagem exata e lista, sem delete', async () => {
    mockGuide('APPROVED')
    db.guideDestination.findUnique.mockResolvedValue({ id: 'gd1' })
    future.mockResolvedValue([
      { id: 'b1', startsAt: new Date('2026-12-01T10:00:00Z'), packageName: 'Trilha', status: 'CONFIRMED' },
    ])
    const res = await app.inject({ method: 'DELETE', url: URL_ME, headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Você tem reservas pendentes, fale com o admin')
    expect(res.json().bookings[0].packageName).toBe('Trilha')
    expect(db.guideDestination.deleteMany).not.toHaveBeenCalled()
    expect(notifyDestinationMembership).not.toHaveBeenCalled()
  })

  it('sem reservas futuras -> 204, apaga e notifica left', async () => {
    mockGuide('APPROVED')
    db.guideDestination.findUnique.mockResolvedValue({ id: 'gd1' })
    db.guideDestination.deleteMany.mockResolvedValue({ count: 1 })
    const res = await app.inject({ method: 'DELETE', url: URL_ME, headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(204)
    expect(db.guideDestination.deleteMany).toHaveBeenCalledWith({ where: { id: 'gd1' } })
    expect(notifyDestinationMembership).toHaveBeenCalledWith(expect.anything(), 'u1', 'd1', 'left')
  })

  it('clique duplo (deleteMany count 0) -> 204 sem notificar', async () => {
    mockGuide('APPROVED')
    db.guideDestination.findUnique.mockResolvedValue({ id: 'gd1' })
    db.guideDestination.deleteMany.mockResolvedValue({ count: 0 })
    const res = await app.inject({ method: 'DELETE', url: URL_ME, headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(204)
    expect(notifyDestinationMembership).not.toHaveBeenCalled()
  })

  it('CLIENTE -> 403', async () => {
    const res = await app.inject({ method: 'DELETE', url: URL_ME, headers: auth('CLIENTE') })
    expect(res.statusCode).toBe(403)
  })
})
