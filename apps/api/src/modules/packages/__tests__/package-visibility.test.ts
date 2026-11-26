import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from '../../../__tests__/helpers/build-app'
import { packagesRoutes } from '../packages.routes'
import { guidesRoutes } from '../../guides/guides.routes'
import { destinationNotArchived } from '../package-visibility'

vi.mock('../../../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    tourPackage: { findMany: vi.fn(), findFirst: vi.fn() },
    packageGuide: { findMany: vi.fn() },
    departureSlot: { findMany: vi.fn() },
  },
}))

vi.mock('../../notifications/guide-events', () => ({
  notifyGuideJoinedPackage: vi.fn().mockResolvedValue(undefined),
}))

import prisma from '../../../database'
const db = prisma as unknown as Record<string, Record<string, Mock>>

const app = buildApp(async (instance) => {
  await instance.register(packagesRoutes)
  await instance.register(guidesRoutes)
})
beforeAll(async () => {
  await app.ready()
})
afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  vi.clearAllMocks()
  db.tenant.findUnique.mockResolvedValue({ id: 't1', slug: 'agencia' })
  db.tourPackage.findMany.mockResolvedValue([])
  db.tourPackage.findFirst.mockResolvedValue(null)
  db.packageGuide.findMany.mockResolvedValue([])
  db.departureSlot.findMany.mockResolvedValue([])
})

/** O where usado contém o filtro de destino arquivado (em qualquer nível de AND). */
function hidesArchivedDestination(where: unknown): boolean {
  return JSON.stringify(where).includes(JSON.stringify(destinationNotArchived))
}

describe('roteiros de destino arquivado ficam fora do público', () => {
  it('GET /packages/search (explorar e home)', async () => {
    await app.inject({ method: 'GET', url: '/packages/search' })
    expect(hidesArchivedDestination(db.tourPackage.findMany.mock.calls[0][0].where)).toBe(true)
  })

  it('GET /packages/search com busca e mapa juntos', async () => {
    await app.inject({
      method: 'GET',
      url: '/packages/search?search=trilha&sw_lat=-10&sw_lng=-45&ne_lat=-5&ne_lng=-40',
    })
    expect(hidesArchivedDestination(db.tourPackage.findMany.mock.calls[0][0].where)).toBe(true)
  })

  it('GET /tenants/:slug/packages', async () => {
    await app.inject({ method: 'GET', url: '/tenants/agencia/packages' })
    expect(hidesArchivedDestination(db.tourPackage.findMany.mock.calls[0][0].where)).toBe(true)
  })

  it('GET /tenants/:slug/packages/:id responde 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/tenants/agencia/packages/p1' })
    expect(res.statusCode).toBe(404)
    expect(hidesArchivedDestination(db.tourPackage.findFirst.mock.calls[0][0].where)).toBe(true)
  })

  it('GET /tenants/:slug/packages/:id/slots responde 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/tenants/agencia/packages/p1/slots' })
    expect(res.statusCode).toBe(404)
    expect(hidesArchivedDestination(db.tourPackage.findFirst.mock.calls[0][0].where)).toBe(true)
  })

  it('GET /packages/:id/guides responde 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/packages/p1/guides' })
    expect(res.statusCode).toBe(404)
    expect(hidesArchivedDestination(db.tourPackage.findFirst.mock.calls[0][0].where)).toBe(true)
  })

  it('GET /guides/:id/packages (perfil do guia)', async () => {
    await app.inject({ method: 'GET', url: '/guides/g1/packages' })
    expect(hidesArchivedDestination(db.packageGuide.findMany.mock.calls[0][0].where)).toBe(true)
  })
})
