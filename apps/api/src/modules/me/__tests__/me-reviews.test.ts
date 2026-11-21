import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'

vi.mock('../../../database', () => {
  const db: any = {
    booking: { findFirst: vi.fn() },
    guideProfile: { findUnique: vi.fn() },
    review: { create: vi.fn(), findMany: vi.fn() },
  }
  return { default: db }
})

import { buildApp } from '../../../__tests__/helpers/build-app'
import { meRoutes } from '../me.routes'
import prisma from '../../../database'

const db = prisma as any
const app = buildApp(meRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => vi.resetAllMocks())

function auth(role = 'CLIENTE') {
  const t = app.jwt.sign({
    sub: 'user-1',
    role,
    tenantId: 'tenant-a',
    name: 'Turista',
    approvalStatus: 'APPROVED',
  })
  return { authorization: `Bearer ${t}` }
}

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: 'booking-1',
    status: 'COMPLETED',
    tenantId: 'tenant-a',
    customerName: 'Turista Silva',
    customerEmail: 'turista@email.com',
    review: null,
    slot: {
      package: { conductorId: 'conductor-1' },
    },
    ...overrides,
  }
}

describe('POST /me/reviews', () => {
  it('cria avaliação para reserva COMPLETED', async () => {
    db.booking.findFirst.mockResolvedValue(makeBooking())
    db.guideProfile.findUnique.mockResolvedValue({ id: 'guide-1' })
    db.review.create.mockResolvedValue({
      id: 'review-1',
      tenantId: 'tenant-a',
      bookingId: 'booking-1',
      guideId: 'guide-1',
      rating: 5,
      comment: 'Excelente!',
      customerName: 'Turista Silva',
      customerEmail: 'turista@email.com',
      createdAt: new Date('2024-01-01'),
    })

    const res = await app.inject({
      method: 'POST',
      url: '/me/reviews',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { bookingId: 'booking-1', rating: 5, comment: 'Excelente!' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ id: 'review-1', rating: 5 })
    expect(db.review.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        bookingId: 'booking-1',
        guideId: 'guide-1',
        rating: 5,
        comment: 'Excelente!',
        customerName: 'Turista Silva',
        customerEmail: 'turista@email.com',
      },
    })
  })

  it('422 se reserva não está COMPLETED', async () => {
    db.booking.findFirst.mockResolvedValue(makeBooking({ status: 'CONFIRMED' }))

    const res = await app.inject({
      method: 'POST',
      url: '/me/reviews',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { bookingId: 'booking-1', rating: 4 },
    })

    expect(res.statusCode).toBe(422)
    expect(db.review.create).not.toHaveBeenCalled()
  })

  it('409 se já existe avaliação para a reserva', async () => {
    db.booking.findFirst.mockResolvedValue(makeBooking({ review: { id: 'rev-existing' } }))

    const res = await app.inject({
      method: 'POST',
      url: '/me/reviews',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { bookingId: 'booking-1', rating: 3 },
    })

    expect(res.statusCode).toBe(409)
    expect(db.review.create).not.toHaveBeenCalled()
  })

  it('404 se reserva não encontrada', async () => {
    db.booking.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'POST',
      url: '/me/reviews',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { bookingId: 'nope', rating: 5 },
    })

    expect(res.statusCode).toBe(404)
  })

  it('sem token → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/me/reviews',
      headers: { 'content-type': 'application/json' },
      payload: { bookingId: 'b1', rating: 5 },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /me/reviews', () => {
  it('retorna lista de avaliações do turista com info do pacote', async () => {
    db.review.findMany.mockResolvedValue([
      {
        id: 'rev-1',
        bookingId: 'booking-1',
        rating: 5,
        comment: 'Ótimo!',
        createdAt: new Date('2024-01-01'),
        booking: {
          slot: {
            package: { name: 'Trilha Capivara', photos: ['https://cdn.x/photo.jpg'] },
          },
        },
      },
    ])

    const res = await app.inject({ method: 'GET', url: '/me/reviews', headers: auth() })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toHaveLength(1)
    expect(body.hasMore).toBe(false)
    expect(body.data[0]).toMatchObject({
      id: 'rev-1',
      bookingId: 'booking-1',
      rating: 5,
      comment: 'Ótimo!',
      packageName: 'Trilha Capivara',
      packageCoverUrl: 'https://cdn.x/photo.jpg',
    })
  })

  it('sem token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/me/reviews' })
    expect(res.statusCode).toBe(401)
  })
})
