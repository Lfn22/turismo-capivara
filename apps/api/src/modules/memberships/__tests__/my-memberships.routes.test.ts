import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from '../../../__tests__/helpers/build-app'

vi.mock('../../../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    guideProfile: { findUnique: vi.fn() },
    guideDestination: { findMany: vi.fn() },
    packageGuide: { findMany: vi.fn() },
  },
}))

import prisma from '../../../database'
import { myMembershipsRoutes } from '../my-memberships.routes'
import { guidesRoutes } from '../../guides/guides.routes'

const db = prisma as unknown as Record<string, Record<string, Mock>>

const app = buildApp(async (instance) => {
  await instance.register(guidesRoutes)
  await instance.register(myMembershipsRoutes)
})
beforeAll(async () => { await app.ready() })
afterAll(async () => { await app.close() })

const auth = (role: string) => ({
  authorization: `Bearer ${app.jwt.sign({ sub: 'u1', tenantId: 't1', role, name: 'X', approvalStatus: 'APPROVED' })}`,
})

beforeEach(() => {
  vi.resetAllMocks()
  db.guideProfile.findUnique.mockResolvedValue({ id: 'gp1' })
  db.guideDestination.findMany.mockResolvedValue([])
  db.packageGuide.findMany.mockResolvedValue([])
})

describe('GET /guides/me/memberships', () => {
  it('sem token -> 401; CLIENTE -> 403', async () => {
    expect((await app.inject({ method: 'GET', url: '/guides/me/memberships' })).statusCode).toBe(401)
    expect((await app.inject({ method: 'GET', url: '/guides/me/memberships', headers: auth('CLIENTE') })).statusCode).toBe(403)
  })

  it('não é engolida por /guides/:id/... e devolve destinos e roteiros mapeados', async () => {
    db.guideDestination.findMany.mockResolvedValue([{ destination: { slug: 'serra-azul', title: 'Serra Azul' } }])
    db.packageGuide.findMany.mockResolvedValue([
      { status: 'PENDING', rejectionReason: null, package: { id: 'p1', name: 'A', tenant: { destination: { slug: 'serra-azul' } } } },
      { status: 'REJECTED', rejectionReason: 'Sem vaga', package: { id: 'p2', name: 'B', tenant: { destination: null } } },
      { status: 'ACCEPTED', rejectionReason: null, package: { id: 'p3', name: 'C', tenant: { destination: { slug: 'x' } } } },
    ])
    const res = await app.inject({ method: 'GET', url: '/guides/me/memberships', headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      destinations: [{ slug: 'serra-azul', title: 'Serra Azul' }],
      packages: [
        { id: 'p1', name: 'A', destinationSlug: 'serra-azul', state: 'PENDING', rejectionReason: null },
        { id: 'p2', name: 'B', destinationSlug: null, state: 'REJECTED', rejectionReason: 'Sem vaga' },
        { id: 'p3', name: 'C', destinationSlug: 'x', state: 'IN', rejectionReason: null },
      ],
    })
    expect(db.packageGuide.findMany.mock.calls[0][0].where).toEqual({
      guideId: 'gp1',
      status: { in: ['PENDING', 'REJECTED', 'ACCEPTED'] },
    })
  })

  it('sem perfil de guia -> 404', async () => {
    db.guideProfile.findUnique.mockResolvedValue(null)
    const res = await app.inject({ method: 'GET', url: '/guides/me/memberships', headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(404)
  })
})
