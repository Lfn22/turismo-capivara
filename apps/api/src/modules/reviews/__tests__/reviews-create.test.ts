import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'

vi.mock('../../../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    booking: { findFirst: vi.fn() },
    guideProfile: { findUnique: vi.fn(), findFirst: vi.fn() },
    review: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn(), aggregate: vi.fn() },
  },
}))

import { buildApp } from '../../../__tests__/helpers/build-app'
import { reviewsRoutes } from '../reviews.routes'
import prisma from '../../../database'

const db = prisma as any
const app = buildApp(reviewsRoutes)
const PAST = new Date(Date.now() - 24 * 3600_000)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => {
  vi.resetAllMocks()
  db.tenant.findUnique.mockResolvedValue({ id: 't1', slug: 'capi' })
  db.review.findUnique.mockResolvedValue(null)
  db.review.create.mockResolvedValue({ id: 'r1', rating: 5 })
})

function booking(slot: Record<string, unknown>, over: Record<string, unknown> = {}) {
  return {
    id: 'b1',
    status: 'CONFIRMED',
    customerEmail: 'ana@x.com',
    slot: { startsAt: PAST, guideId: null, package: { conductorId: null }, ...slot },
    ...over,
  }
}

const payload = { bookingId: 'b1', rating: 5, customerName: 'Ana', customerEmail: 'ANA@x.com' }
const post = () => app.inject({ method: 'POST', url: '/tenants/capi/reviews', payload })

describe('POST /tenants/:slug/reviews', () => {
  it('slot com guia atribuído: slot.guideId já é o GuideProfile.id', async () => {
    db.booking.findFirst.mockResolvedValue(booking({ guideId: 'gp-7' }))

    const res = await post()

    expect(res.statusCode).toBe(201)
    expect(db.guideProfile.findUnique).not.toHaveBeenCalled()
    expect(db.review.create.mock.calls[0][0].data.guideId).toBe('gp-7')
  })

  it('sem guia no slot: usa o perfil do condutor do roteiro', async () => {
    db.booking.findFirst.mockResolvedValue(booking({ package: { conductorId: 'user-9' } }))
    db.guideProfile.findUnique.mockResolvedValue({ id: 'gp-9' })

    const res = await post()

    expect(res.statusCode).toBe(201)
    expect(db.guideProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-9' },
      select: { id: true },
    })
    expect(db.review.create.mock.calls[0][0].data.guideId).toBe('gp-9')
  })

  it('passeio ainda não aconteceu → 422', async () => {
    db.booking.findFirst.mockResolvedValue(
      booking({ guideId: 'gp-7', startsAt: new Date(Date.now() + 3600_000) }),
    )
    const res = await post()
    expect(res.statusCode).toBe(422)
    expect(db.review.create).not.toHaveBeenCalled()
  })

  it('avaliação concorrente (P2002) → 409, não 500', async () => {
    db.booking.findFirst.mockResolvedValue(booking({ guideId: 'gp-7' }))
    db.review.create.mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }))
    const res = await post()
    expect(res.statusCode).toBe(409)
  })
})

describe('GET /tenants/:slug/guides/:guideId/reviews', () => {
  it('guia não aprovado (suspenso/rejeitado) → 404', async () => {
    db.guideProfile.findFirst.mockResolvedValue(null)
    const res = await app.inject({ method: 'GET', url: '/tenants/capi/guides/gp1/reviews' })
    expect(res.statusCode).toBe(404)
    expect(db.guideProfile.findFirst.mock.calls[0][0].where).toEqual({
      id: 'gp1',
      user: { approvalStatus: 'APPROVED' },
    })
    expect(db.review.findMany).not.toHaveBeenCalled()
  })
})
