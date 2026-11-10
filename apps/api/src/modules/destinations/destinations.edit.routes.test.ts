import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'

vi.mock('../../database', () => ({
  default: {
    tenant: { findUnique: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
    guideDestination: { count: vi.fn() },
    tenantDestination: { count: vi.fn() },
    tourPackage: { count: vi.fn() },
    user: { findUnique: vi.fn() },
    destination: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  },
}))

import { Prisma } from '@prisma/client'
import { buildApp } from '../../__tests__/helpers/build-app'
import { destinationsRoutes } from './destinations.routes'
import prisma from '../../database'

// Geocodificação (Nominatim) nunca vai à rede nos testes
const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

function geocodeReturns(lat: string, lon: string) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => [{ lat, lon }] })
}

const db = prisma as any
const app = buildApp(destinationsRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => {
  vi.resetAllMocks()
  db.auditLog.create.mockResolvedValue({})
  fetchMock.mockResolvedValue({ ok: false })
})

function auth(role: string, tenantId = 'tenant-a') {
  db.user.findUnique.mockResolvedValue({ role })
  const t = app.jwt.sign({ sub: 'user-1', role, tenantId, name: 'Teste', approvalStatus: 'APPROVED' })
  return { authorization: `Bearer ${t}` }
}

describe('PATCH /destinations/:destinationSlug', () => {
  it('ADMIN com tenant não ligado → 403 sem update', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1' })
    db.tenant.findFirst.mockResolvedValue(null)
    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/serra-da-capivara',
      headers: auth('ADMIN'),
      payload: { title: 'Novo' },
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().message).toBe('Acesso negado')
    expect(db.destination.update).not.toHaveBeenCalled()
  })

  it('CONDUTOR → 403', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/serra-da-capivara',
      headers: auth('CONDUTOR'),
      payload: { title: 'Novo' },
    })
    expect(res.statusCode).toBe(403)
    expect(db.destination.update).not.toHaveBeenCalled()
  })

  it('ADMIN ligado → 200, sem approvalStatus no update e com state', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1' })
    db.tenant.findFirst.mockResolvedValue({ id: 'tenant-a' })
    db.destination.update.mockResolvedValue({ slug: 'serra-da-capivara', title: 'Novo', active: true })
    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/serra-da-capivara',
      headers: auth('ADMIN'),
      payload: { title: 'Novo', state: 'PI' },
    })
    expect(res.statusCode).toBe(200)
    const arg = db.destination.update.mock.calls[0][0]
    expect(arg.data).not.toHaveProperty('approvalStatus')
    expect(arg.data.state).toBe('PI')
    expect(arg.select).toMatchObject({ approvalStatus: true, active: true, description: true })
  })

  it('título ou estado mudou → recalcula lat/lng', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1', title: 'Serra', state: 'PI' })
    db.destination.update.mockResolvedValue({})
    geocodeReturns('-8.8', '-42.5')
    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/serra',
      headers: auth('SUPER_ADMIN'),
      payload: { state: 'BA' },
    })
    expect(res.statusCode).toBe(200)
    expect(String(fetchMock.mock.calls[0][0])).toContain(encodeURIComponent('Serra, BA, Brasil'))
    expect(db.destination.update.mock.calls[0][0].data).toMatchObject({ state: 'BA', lat: -8.8, lng: -42.5 })
  })

  it('geocodificação falhou → 200 sem mexer em lat/lng', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1', title: 'Serra', state: 'PI' })
    db.destination.update.mockResolvedValue({})
    fetchMock.mockRejectedValue(new Error('offline'))
    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/serra',
      headers: auth('SUPER_ADMIN'),
      payload: { title: 'Serra Nova' },
    })
    expect(res.statusCode).toBe(200)
    const data = db.destination.update.mock.calls[0][0].data
    expect(data.title).toBe('Serra Nova')
    expect(data).not.toHaveProperty('lat')
  })

  it('sem mudar título nem estado → não geocodifica', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1', title: 'Serra', state: 'PI' })
    db.destination.update.mockResolvedValue({})
    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/serra',
      headers: auth('SUPER_ADMIN'),
      payload: { title: 'Serra', description: 'Outra descrição' },
    })
    expect(res.statusCode).toBe(200)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('destino inexistente → 404', async () => {
    db.destination.findUnique.mockResolvedValue(null)
    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/nada',
      headers: auth('SUPER_ADMIN'),
      payload: { title: 'Novo' },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('POST /destinations', () => {
  const payload = { title: 'Serra Nova', description: 'Descrição longa o bastante', state: 'PI' }

  it('ADMIN → 403', async () => {
    const res = await app.inject({ method: 'POST', url: '/destinations', headers: auth('ADMIN'), payload })
    expect(res.statusCode).toBe(403)
    expect(db.destination.create).not.toHaveBeenCalled()
  })

  it('SUPER_ADMIN → 201 APPROVED e ativo', async () => {
    db.destination.findMany.mockResolvedValue([])
    db.destination.create.mockImplementation(async ({ data }: any) => ({ id: 'd1', ...data }))
    const res = await app.inject({ method: 'POST', url: '/destinations', headers: auth('SUPER_ADMIN'), payload })
    expect(res.statusCode).toBe(201)
    const data = db.destination.create.mock.calls[0][0].data
    expect(data).toMatchObject({
      slug: 'serra-nova',
      title: 'Serra Nova',
      approvalStatus: 'APPROVED',
      active: true,
      createdById: 'user-1',
    })
    expect(res.json().approvalStatus).toBe('APPROVED')
  })

  it('geocodifica e grava lat/lng; auditoria só com campos do modelo', async () => {
    db.destination.findMany.mockResolvedValue([])
    db.destination.create.mockImplementation(async ({ data }: any) => ({ id: 'd1', ...data }))
    geocodeReturns('-8.8', '-42.5')
    const res = await app.inject({ method: 'POST', url: '/destinations', headers: auth('SUPER_ADMIN'), payload })
    expect(res.statusCode).toBe(201)
    expect(db.destination.create.mock.calls[0][0].data).toMatchObject({ lat: -8.8, lng: -42.5 })
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorType: 'USER',
        action: 'destination.created',
        targetType: 'DESTINATION',
        targetId: 'd1',
        ipAddress: expect.any(String),
        metadata: { actorUserId: 'user-1', destinationName: 'Serra Nova' },
      },
    })
  })

  it('título sem letras nem números → 400 sem criar', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/destinations',
      headers: auth('SUPER_ADMIN'),
      payload: { ...payload, title: '???' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('O título precisa ter letras ou números')
    expect(db.destination.create).not.toHaveBeenCalled()
  })

  it('slug colidindo → serra-nova-2', async () => {
    db.destination.findMany.mockResolvedValue([{ slug: 'serra-nova' }])
    db.destination.create.mockImplementation(async ({ data }: any) => ({ id: 'd1', ...data }))
    const res = await app.inject({ method: 'POST', url: '/destinations', headers: auth('PLATFORM_ADMIN'), payload })
    expect(res.statusCode).toBe(201)
    expect(db.destination.create.mock.calls[0][0].data.slug).toBe('serra-nova-2')
  })

  it('payload inválido → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/destinations',
      headers: auth('SUPER_ADMIN'),
      payload: { title: 'ab', description: 'curta', state: 'XX' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('Dados inválidos')
  })
})

describe('POST /destinations/:destinationSlug/archive e restore', () => {
  it('archive → update { active: false }', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'd1', slug: 'x', active: true })
    db.destination.update.mockResolvedValue({})
    const res = await app.inject({ method: 'POST', url: '/destinations/x/archive', headers: auth('SUPER_ADMIN') })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ slug: 'x', active: false })
    expect(db.destination.update).toHaveBeenCalledWith(expect.objectContaining({ data: { active: false } }))
  })

  it('restore em destino já ativo → 200 sem update', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'd1', slug: 'x', active: true })
    const res = await app.inject({ method: 'POST', url: '/destinations/x/restore', headers: auth('SUPER_ADMIN') })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ slug: 'x', active: true })
    expect(db.destination.update).not.toHaveBeenCalled()
  })

  it('restore em destino arquivado → update { active: true }', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'd1', slug: 'x', active: false })
    db.destination.update.mockResolvedValue({})
    const res = await app.inject({ method: 'POST', url: '/destinations/x/restore', headers: auth('PLATFORM_ADMIN') })
    expect(res.statusCode).toBe(200)
    expect(db.destination.update).toHaveBeenCalledWith(expect.objectContaining({ data: { active: true } }))
  })

  it('ADMIN → 403', async () => {
    const res = await app.inject({ method: 'POST', url: '/destinations/x/archive', headers: auth('ADMIN') })
    expect(res.statusCode).toBe(403)
  })

  it('destino inexistente → 404', async () => {
    db.destination.findUnique.mockResolvedValue(null)
    const res = await app.inject({ method: 'POST', url: '/destinations/x/archive', headers: auth('SUPER_ADMIN') })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /destinations/:destinationSlug', () => {
  const dest = { id: 'd1', slug: 'serra-da-capivara', title: 'Serra da Capivara' }

  it('nome confere sem diferenciar caixa e espaços → 204', async () => {
    db.destination.findUnique.mockResolvedValue(dest)
    db.tenant.count.mockResolvedValue(0)
    db.guideDestination.count.mockResolvedValue(0)
    db.tenantDestination.count.mockResolvedValue(0)
    db.tourPackage.count.mockResolvedValue(0)
    db.destination.delete.mockResolvedValue({})
    const res = await app.inject({
      method: 'DELETE',
      url: '/destinations/serra-da-capivara',
      headers: auth('SUPER_ADMIN'),
      payload: { confirmName: ' serra da capivara ' },
    })
    expect(res.statusCode).toBe(204)
    expect(db.destination.delete).toHaveBeenCalledWith({ where: { id: 'd1' } })
  })

  it('vínculo criado durante a exclusão (FK P2003) → 409', async () => {
    db.destination.findUnique.mockResolvedValue(dest)
    db.tenant.count.mockResolvedValue(0)
    db.guideDestination.count.mockResolvedValue(0)
    db.tenantDestination.count.mockResolvedValue(0)
    db.tourPackage.count.mockResolvedValue(0)
    db.destination.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('fk', { code: 'P2003', clientVersion: 'test' }),
    )
    const res = await app.inject({
      method: 'DELETE',
      url: '/destinations/serra-da-capivara',
      headers: auth('SUPER_ADMIN'),
      payload: { confirmName: 'Serra da Capivara' },
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Este destino tem agências ou roteiros ligados. Arquive em vez de excluir.')
  })

  it('nome diferente → 400', async () => {
    db.destination.findUnique.mockResolvedValue(dest)
    const res = await app.inject({
      method: 'DELETE',
      url: '/destinations/serra-da-capivara',
      headers: auth('SUPER_ADMIN'),
      payload: { confirmName: 'outra' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('O nome não confere')
    expect(db.destination.delete).not.toHaveBeenCalled()
  })

  it('com tenants ligados → 409', async () => {
    db.destination.findUnique.mockResolvedValue(dest)
    db.tenant.count.mockResolvedValue(2)
    db.guideDestination.count.mockResolvedValue(0)
    const res = await app.inject({
      method: 'DELETE',
      url: '/destinations/serra-da-capivara',
      headers: auth('SUPER_ADMIN'),
      payload: { confirmName: 'Serra da Capivara' },
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Este destino tem agências ou roteiros ligados. Arquive em vez de excluir.')
    expect(db.destination.delete).not.toHaveBeenCalled()
  })

  it('com guias ligados → 409', async () => {
    db.destination.findUnique.mockResolvedValue(dest)
    db.tenant.count.mockResolvedValue(0)
    db.guideDestination.count.mockResolvedValue(1)
    const res = await app.inject({
      method: 'DELETE',
      url: '/destinations/serra-da-capivara',
      headers: auth('SUPER_ADMIN'),
      payload: { confirmName: 'Serra da Capivara' },
    })
    expect(res.statusCode).toBe(409)
  })

  it.each(['tenantDestination', 'tourPackage'])('com %s ligado → 409', async (model) => {
    db.destination.findUnique.mockResolvedValue(dest)
    db.tenant.count.mockResolvedValue(0)
    db.guideDestination.count.mockResolvedValue(0)
    db.tenantDestination.count.mockResolvedValue(model === 'tenantDestination' ? 1 : 0)
    db.tourPackage.count.mockResolvedValue(model === 'tourPackage' ? 1 : 0)
    const res = await app.inject({
      method: 'DELETE',
      url: '/destinations/serra-da-capivara',
      headers: auth('SUPER_ADMIN'),
      payload: { confirmName: 'Serra da Capivara' },
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Este destino tem agências ou roteiros ligados. Arquive em vez de excluir.')
    expect(db.destination.delete).not.toHaveBeenCalled()
  })

  it('ADMIN → 403', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/destinations/serra-da-capivara',
      headers: auth('ADMIN'),
      payload: { confirmName: 'Serra da Capivara' },
    })
    expect(res.statusCode).toBe(403)
  })
})
