import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'

const tx = {
  user: { update: vi.fn() },
  booking: { updateMany: vi.fn() },
  review: { updateMany: vi.fn() },
  testimonial: { updateMany: vi.fn() },
  favorite: { deleteMany: vi.fn() },
  notification: { deleteMany: vi.fn() },
  refreshToken: { updateMany: vi.fn() },
}

vi.mock('../../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    booking: { findMany: vi.fn() },
    favorite: { findMany: vi.fn() },
    review: { findMany: vi.fn() },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  },
}))

import { buildApp } from '../../__tests__/helpers/build-app'
import { usersRoutes } from './users.routes'
import prisma from '../../database'

const db = prisma as any
const app = buildApp(usersRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  db.tenant.findUnique.mockResolvedValue({ id: 't1', slug: 'capi' })
  db.user.findUnique.mockResolvedValue({
    id: 'u1',
    name: 'Ana',
    email: 'ana@x.com',
    role: 'CLIENTE',
    cpf: '52998224725',
    photoUrl: null,
    createdAt: new Date(),
  })
})

function auth() {
  const t = app.jwt.sign({
    sub: 'u1',
    role: 'CLIENTE',
    tenantId: 't1',
    name: 'Ana',
    approvalStatus: 'APPROVED',
  })
  return { authorization: `Bearer ${t}` }
}

const mine = { OR: [{ userId: 'u1' }, { customerEmail: 'ana@x.com' }] }

describe('DELETE /tenants/:slug/users/me (LGPD — eliminação)', () => {
  it('revoga as sessões (refresh tokens) na mesma transação', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/tenants/capi/users/me',
      headers: auth(),
    })
    expect(res.statusCode).toBe(204)
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', revokedAt: null } }),
    )
  })

  it('anonimiza todos os dados pessoais do usuário, com valor aleatório (não reversível)', async () => {
    await app.inject({ method: 'DELETE', url: '/tenants/capi/users/me', headers: auth() })
    const data = tx.user.update.mock.calls[0][0].data
    expect(data).toMatchObject({
      name: 'Usuário Removido',
      cpf: null,
      photoUrl: null,
      pendingEmail: null,
    })
    expect(data.email).toMatch(/^removido-[0-9a-f-]{36}@anonimo\.invalid$/)
    expect(data.password).not.toBe('')

    await app.inject({ method: 'DELETE', url: '/tenants/capi/users/me', headers: auth() })
    expect(tx.user.update.mock.calls[1][0].data.email).not.toBe(data.email)
  })

  it('anonimiza reservas de todos os tenants (por userId ou e-mail), avaliações e depoimentos', async () => {
    await app.inject({ method: 'DELETE', url: '/tenants/capi/users/me', headers: auth() })
    const bk = tx.booking.updateMany.mock.calls[0][0]
    expect(bk.where).toEqual(mine)
    expect(bk.data).toMatchObject({
      customerName: 'Usuário Removido',
      customerPhone: '',
      customerCpfHash: null,
    })
    expect(tx.review.updateMany.mock.calls[0][0].where).toEqual({ booking: mine })
    expect(tx.testimonial.updateMany.mock.calls[0][0].where).toEqual({ booking: mine })
    expect(tx.favorite.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
    expect(tx.notification.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
  })
})

describe('GET /tenants/:slug/users/me/export (LGPD — acesso)', () => {
  it('exporta reservas de todos os tenants com dados de contato, favoritos e avaliações', async () => {
    db.booking.findMany.mockResolvedValue([{ id: 'b1' }])
    db.favorite.findMany.mockResolvedValue([{ id: 'f1' }])
    db.review.findMany.mockResolvedValue([{ id: 'r1' }])

    const res = await app.inject({
      method: 'GET',
      url: '/tenants/capi/users/me/export',
      headers: auth(),
    })

    expect(res.statusCode).toBe(200)
    expect(db.booking.findMany.mock.calls[0][0].where).toEqual(mine)
    expect(db.booking.findMany.mock.calls[0][0].select).toMatchObject({
      customerPhone: true,
      customerName: true,
    })
    expect(res.json()).toMatchObject({
      bookings: [{ id: 'b1' }],
      favorites: [{ id: 'f1' }],
      reviews: [{ id: 'r1' }],
    })
    expect(res.json().user.cpf).toBe('52998224725')
  })
})
