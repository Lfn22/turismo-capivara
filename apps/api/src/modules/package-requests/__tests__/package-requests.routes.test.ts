import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from '../../../__tests__/helpers/build-app'
import { packageRequestsRoutes } from '../package-requests.routes'

vi.mock('../../../database', () => ({
  default: {
    packageChangeRequest: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    tenant: { findUnique: vi.fn() },
    tourPackage: { findFirst: vi.fn() },
  },
}))
vi.mock('../package-requests.service', () => ({
  approveRequest: vi.fn(),
  rejectRequest: vi.fn(),
  cancelRequest: vi.fn(),
}))

import prisma from '../../../database'
import { approveRequest, cancelRequest } from '../package-requests.service'
const db = prisma as unknown as {
  packageChangeRequest: { findMany: Mock }
  user: { findUnique: Mock }
  tenant: { findUnique: Mock }
  tourPackage: { findFirst: Mock }
}

const app = buildApp(packageRequestsRoutes)
let superToken: string
let guideToken: string

beforeAll(async () => {
  await app.ready()
  superToken = app.jwt.sign({ sub: 's1', role: 'SUPER_ADMIN', tenantId: 't0', name: 'Staff' })
  guideToken = app.jwt.sign({ sub: 'g1', role: 'CONDUTOR', tenantId: 't1', name: 'Guia' })
})
afterAll(async () => {
  await app.close()
})
beforeEach(() => {
  vi.clearAllMocks()
  db.user.findUnique.mockResolvedValue({ role: 'SUPER_ADMIN' })
})

describe('package-requests (equipe)', () => {
  it('GET exige SUPER_ADMIN', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/package-requests',
      headers: { authorization: `Bearer ${guideToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('GET serializa price como número', async () => {
    db.packageChangeRequest.findMany.mockResolvedValue([
      {
        id: 'r1',
        type: 'UPDATE',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date('2026-11-27T10:00:00.000Z'),
        changes: { price: { from: 600, to: 700 } },
        package: {
          id: 'p1',
          name: 'Trilha',
          description: 'd',
          price: '600.00',
          extraGuidePrice: null,
          active: true,
          publishedAt: new Date('2026-01-01T00:00:00.000Z'),
          tenant: { slug: 'acme' },
          destination: { title: 'Bonito' },
        },
        requestedBy: { id: 'g1', name: 'Guia' },
      },
    ])
    const res = await app.inject({
      method: 'GET',
      url: '/admin/package-requests',
      headers: { authorization: `Bearer ${superToken}` },
    })
    expect(res.statusCode).toBe(200)
    const [r] = res.json().requests
    expect(r.package.price).toBe(600)
    expect(r.package.tenantSlug).toBe('acme')
    expect(r.package.destinationTitle).toBe('Bonito')
    expect(r.package.active).toBe(true)
    expect(r.package.publishedAt).toBe('2026-01-01T00:00:00.000Z')
    expect(r.updatedAt).toBe('2026-11-27T10:00:00.000Z')
  })

  it('approve sem updatedAt → 400 e não aprova', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/package-requests/r1/approve',
      headers: { authorization: `Bearer ${superToken}` },
      payload: {},
    })
    expect(res.statusCode).toBe(400)
    expect(approveRequest).not.toHaveBeenCalled()
  })

  it('approve repassa o updatedAt revisado ao serviço', async () => {
    ;(approveRequest as Mock).mockResolvedValue({ id: 'r1', status: 'APPROVED' })
    const res = await app.inject({
      method: 'POST',
      url: '/admin/package-requests/r1/approve',
      headers: { authorization: `Bearer ${superToken}` },
      payload: { updatedAt: '2026-11-27T10:00:00.000Z' },
    })
    expect(res.statusCode).toBe(200)
    expect(approveRequest).toHaveBeenCalledWith(
      'r1',
      's1',
      expect.anything(),
      new Date('2026-11-27T10:00:00.000Z'),
    )
  })

  it('reject com motivo curto → 400 em português', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/package-requests/r1/reject',
      headers: { authorization: `Bearer ${superToken}` },
      payload: { reason: 'abc' },
    })
    expect(res.statusCode).toBe(400)
    expect(JSON.stringify(res.json())).toContain('ao menos 5 caracteres')
  })

  describe('DELETE /tenants/:slug/packages/:id/request', () => {
    const del = () =>
      app.inject({
        method: 'DELETE',
        url: '/tenants/acme/packages/p1/request',
        headers: { authorization: `Bearer ${guideToken}` },
      })
    beforeEach(() => {
      db.tenant.findUnique.mockResolvedValue({ id: 't1' })
    })

    it('204 para o dono', async () => {
      db.tourPackage.findFirst.mockResolvedValue({ tenantId: 't1', conductorId: 'g1' })
      expect((await del()).statusCode).toBe(204)
      expect(cancelRequest).toHaveBeenCalledWith('p1', 'g1')
    })

    it('403 se o roteiro é de outro guia', async () => {
      db.tourPackage.findFirst.mockResolvedValue({ tenantId: 't1', conductorId: 'outro' })
      expect((await del()).statusCode).toBe(403)
    })

    it('404 se o roteiro não existe', async () => {
      db.tourPackage.findFirst.mockResolvedValue(null)
      expect((await del()).statusCode).toBe(404)
    })
  })
})
