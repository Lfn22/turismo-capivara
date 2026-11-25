import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'

vi.mock('../../../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    destination: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}))

import { buildApp } from '../../../__tests__/helpers/build-app'
import { tenantDestinationsRoute } from '../routes/tenant.route'
import prisma from '../../../database'

const db = prisma as any
const app = buildApp(tenantDestinationsRoute)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => {
  vi.resetAllMocks()
  db.tenant.findUnique.mockResolvedValue({ id: 't1', slug: 'agencia' })
  db.destination.findMany.mockResolvedValue([])
  db.destination.findFirst.mockResolvedValue(null)
})

function auth(role: string) {
  db.user.findUnique.mockResolvedValue({ role })
  const t = app.jwt.sign({ sub: 'u1', role, tenantId: 't1', name: 'X', approvalStatus: 'APPROVED' })
  return { authorization: `Bearer ${t}` }
}

const ownScope = { OR: [{ createdBy: { tenantId: 't1' } }, { tenants: { some: { id: 't1' } } }] }

describe('destinos do painel da agência', () => {
  it('ADMIN lista só destinos da própria agência (não propostas de outras)', async () => {
    await app.inject({
      method: 'GET',
      url: '/tenants/agencia/destinations',
      headers: auth('ADMIN'),
    })
    expect(db.destination.findMany.mock.calls[0][0].where).toEqual(ownScope)
  })

  it('ADMIN não abre destino de outra agência pelo id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/agencia/destinations/d9',
      headers: auth('ADMIN'),
    })
    expect(res.statusCode).toBe(404)
    expect(db.destination.findFirst.mock.calls[0][0].where).toEqual({ id: 'd9', ...ownScope })
  })

  it('PLATFORM_ADMIN continua vendo todos', async () => {
    await app.inject({
      method: 'GET',
      url: '/tenants/agencia/destinations',
      headers: auth('PLATFORM_ADMIN'),
    })
    expect(db.destination.findMany.mock.calls[0][0].where).not.toHaveProperty('OR')
  })
})
