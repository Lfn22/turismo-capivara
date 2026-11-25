import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'

vi.mock('../../../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    guideProfile: { findUnique: vi.fn() },
    booking: { findMany: vi.fn() },
  },
}))

import { buildApp } from '../../../__tests__/helpers/build-app'
import { guidesRoutes } from '../guides.routes'
import prisma from '../../../database'

const db = prisma as any
const app = buildApp(guidesRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => {
  vi.resetAllMocks()
  db.tenant.findUnique.mockResolvedValue({ id: 't1', slug: 'agencia' })
  db.user.findUnique.mockResolvedValue({ role: 'CONDUTOR', approvalStatus: 'APPROVED' })
  db.guideProfile.findUnique.mockResolvedValue({ id: 'gp1' })
  db.booking.findMany.mockResolvedValue([
    {
      id: 'b1',
      customerName: 'Ana',
      customerCpfHash: 'h',
      customerPhone: '1',
      cancelToken: 'secret',
      idempotencyKey: 'k',
      slot: { package: { id: 'p1' } },
    },
  ])
})

function auth() {
  const t = app.jwt.sign({
    sub: 'u1',
    role: 'CONDUTOR',
    tenantId: 't1',
    name: 'G',
    approvalStatus: 'APPROVED',
  })
  return { authorization: `Bearer ${t}` }
}

describe('GET /tenants/:slug/guides/me/bookings', () => {
  it('inclui reservas dos slots atribuídos ao guia (multi-guia), não só dos roteiros que conduz', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/agencia/guides/me/bookings',
      headers: auth(),
    })

    expect(res.statusCode).toBe(200)
    expect(db.booking.findMany.mock.calls[0][0].where).toEqual({
      tenantId: 't1',
      OR: [{ slot: { guideId: 'gp1' } }, { slot: { package: { conductorId: 'u1' } } }],
    })
  })

  it('não expõe CPF, telefone, token de cancelamento nem chave de idempotência', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/agencia/guides/me/bookings',
      headers: auth(),
    })
    const b = res.json().bookings[0]
    for (const k of ['customerCpfHash', 'customerPhone', 'cancelToken', 'idempotencyKey']) {
      expect(b).not.toHaveProperty(k)
    }
  })
})
