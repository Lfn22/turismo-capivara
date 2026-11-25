import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'

vi.mock('../../database', () => ({
  default: { user: { findUnique: vi.fn() }, auditLog: { findMany: vi.fn() } },
}))

import { buildApp } from '../../__tests__/helpers/build-app'
import { auditRoutes } from './audit.routes'
import prisma from '../../database'

const db = prisma as any
const app = buildApp(auditRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => {
  vi.resetAllMocks()
  db.user.findUnique.mockResolvedValue({ role: 'SUPER_ADMIN' })
  db.auditLog.findMany.mockResolvedValue([])
})

const headers = () => ({
  authorization: `Bearer ${app.jwt.sign({ sub: 'sa', role: 'SUPER_ADMIN', tenantId: 'p', name: 'SA' })}`,
})

describe('GET /admin/audit-logs — filtros', () => {
  it('actorId e tenantSlug filtram pelo metadata (antes eram aceitos e ignorados)', async () => {
    await app.inject({
      method: 'GET',
      url: '/admin/audit-logs?actorId=u1&tenantSlug=capi',
      headers: headers(),
    })
    expect(db.auditLog.findMany.mock.calls[0][0].where).toEqual({
      AND: [
        { metadata: { path: ['actorUserId'], equals: 'u1' } },
        { metadata: { path: ['tenantSlug'], equals: 'capi' } },
      ],
    })
  })
})
