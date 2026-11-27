import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'

vi.mock('../../../database', () => {
  const db: any = {
    booking: { findMany: vi.fn(), findFirst: vi.fn() },
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

function makeBooking(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    code: `CODE-${id}`,
    status: 'CONFIRMED',
    pax: 2,
    createdAt: new Date('2024-01-01'),
    slot: {
      startsAt: new Date('2024-06-01'),
      package: {
        id: 'pkg-1',
        name: 'Trilha Capivara',
        photos: ['https://cdn.x/photo.jpg'],
        duration: 4,
        difficulty: 'EASY',
      },
    },
    tenant: { slug: 'capi', name: 'CAPI' },
    ...overrides,
  }
}

function makeBookingDetail(id: string, userId = 'user-1') {
  return {
    id,
    code: `CODE-${id}`,
    status: 'CONFIRMED',
    pax: 2,
    qrCode: 'qr-data',
    paymentUrl: null,
    expiresAt: null,
    createdAt: new Date('2024-01-01'),
    userId,
    slot: {
      startsAt: new Date('2024-06-01'),
      capacity: 10,
      booked: 2,
      package: {
        id: 'pkg-1',
        name: 'Trilha Capivara',
        photos: ['https://cdn.x/photo.jpg'],
        duration: 4,
        difficulty: 'EASY',
        meetingPointName: 'Portão Sul',
        meetingPointLat: -15.0,
        meetingPointLng: -47.0,
        conductor: {
          name: 'João Guia',
          guideProfile: { photoUrl: 'https://cdn.x/guide.jpg' },
        },
      },
    },
    tenant: { slug: 'capi', name: 'CAPI' },
    review: null,
    voucher: null,
  }
}

describe('GET /me/bookings', () => {
  it('sem token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/me/bookings' })
    expect(res.statusCode).toBe(401)
  })

  it('CONDUTOR → 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/me/bookings', headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(403)
  })

  it('200 com lista paginada', async () => {
    db.booking.findMany.mockResolvedValue([makeBooking('b1'), makeBooking('b2')])
    const res = await app.inject({ method: 'GET', url: '/me/bookings', headers: auth() })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toHaveLength(2)
    expect(body.nextCursor).toBeNull()
    expect(body.hasMore).toBe(false)
    expect(body.data[0]).toMatchObject({
      id: 'b1',
      packageName: 'Trilha Capivara',
      coverImageUrl: 'https://cdn.x/photo.jpg',
      durationHours: 4,
      tenantSlug: 'capi',
    })
  })

  it('retorna guides e isPrivate da reserva', async () => {
    db.booking.findMany.mockResolvedValue([
      makeBooking('b1', { pax: 12, guides: 2, isPrivate: true }),
    ])
    const res = await app.inject({ method: 'GET', url: '/me/bookings', headers: auth() })
    expect(res.json().data[0]).toMatchObject({ pax: 12, guides: 2, isPrivate: true })
    const arg = db.booking.findMany.mock.calls[0][0]
    expect(arg.select).toMatchObject({ guides: true, isPrivate: true })
  })

  it('filtra por status=upcoming — passa statuses corretos', async () => {
    db.booking.findMany.mockResolvedValue([])
    await app.inject({ method: 'GET', url: '/me/bookings?status=upcoming', headers: auth() })
    expect(db.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          status: { in: expect.arrayContaining(['CONFIRMED', 'PENDING', 'CHECKED_IN']) },
        },
      }),
    )
  })

  it('filtra por status=past — passa statuses corretos', async () => {
    db.booking.findMany.mockResolvedValue([])
    await app.inject({ method: 'GET', url: '/me/bookings?status=past', headers: auth() })
    expect(db.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          status: { in: expect.arrayContaining(['COMPLETED', 'CANCELLED']) },
        },
      }),
    )
  })

  it('21 resultados → hasMore true e nextCursor preenchido', async () => {
    const bookings = Array.from({ length: 21 }, (_, i) => makeBooking(`b${i}`))
    db.booking.findMany.mockResolvedValue(bookings)
    const res = await app.inject({ method: 'GET', url: '/me/bookings', headers: auth() })
    const body = res.json()
    expect(body.hasMore).toBe(true)
    expect(body.nextCursor).toBe('b19')
    expect(body.data).toHaveLength(20)
  })

  it('cursor → repassa cursor e skip', async () => {
    db.booking.findMany.mockResolvedValue([])
    await app.inject({ method: 'GET', url: '/me/bookings?cursor=abc', headers: auth() })
    expect(db.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: 'abc' }, skip: 1 }),
    )
  })

  it('package sem foto → coverImageUrl null', async () => {
    db.booking.findMany.mockResolvedValue([
      makeBooking('b1', {
        slot: {
          startsAt: new Date(),
          package: { id: 'p', name: 'X', photos: [], duration: 2, difficulty: 'HARD' },
        },
      }),
    ])
    // override tenant too since makeBooking spread doesn't deep-merge
    db.booking.findMany.mockResolvedValue([
      {
        ...makeBooking('b1'),
        slot: {
          startsAt: new Date(),
          package: { id: 'p', name: 'X', photos: [], duration: 2, difficulty: 'HARD' },
        },
        tenant: { slug: 'capi', name: 'CAPI' },
      },
    ])
    const res = await app.inject({ method: 'GET', url: '/me/bookings', headers: auth() })
    expect(res.json().data[0].coverImageUrl).toBeNull()
  })
})

describe('GET /me/bookings/:id', () => {
  it('sem token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/me/bookings/b1' })
    expect(res.statusCode).toBe(401)
  })

  it('CONDUTOR → 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/me/bookings/b1',
      headers: auth('CONDUTOR'),
    })
    expect(res.statusCode).toBe(403)
  })

  it('não encontrado → 404', async () => {
    db.booking.findFirst.mockResolvedValue(null)
    const res = await app.inject({ method: 'GET', url: '/me/bookings/b1', headers: auth() })
    expect(res.statusCode).toBe(404)
    expect(res.json().message).toBe('Reserva não encontrada')
  })

  it('booking de outro usuário → 404', async () => {
    db.booking.findFirst.mockResolvedValue(makeBookingDetail('b1', 'other-user'))
    const res = await app.inject({ method: 'GET', url: '/me/bookings/b1', headers: auth() })
    expect(res.statusCode).toBe(404)
  })

  it('200 com detalhe completo', async () => {
    db.booking.findFirst.mockResolvedValue(makeBookingDetail('b1'))
    const res = await app.inject({ method: 'GET', url: '/me/bookings/b1', headers: auth() })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toMatchObject({
      id: 'b1',
      packageName: 'Trilha Capivara',
      coverImageUrl: 'https://cdn.x/photo.jpg',
      durationHours: 4,
      meetingPointName: 'Portão Sul',
      tenantSlug: 'capi',
      hasReview: false,
      voucherId: null,
      conductor: { name: 'João Guia', photoUrl: 'https://cdn.x/guide.jpg' },
    })
  })

  it('booking com review → hasReview true', async () => {
    db.booking.findFirst.mockResolvedValue({ ...makeBookingDetail('b1'), review: { id: 'rev-1' } })
    const res = await app.inject({ method: 'GET', url: '/me/bookings/b1', headers: auth() })
    expect(res.json().hasReview).toBe(true)
  })

  it('conductor null → conductor null no response', async () => {
    const detail = makeBookingDetail('b1')
    detail.slot.package.conductor = null as any
    db.booking.findFirst.mockResolvedValue(detail)
    const res = await app.inject({ method: 'GET', url: '/me/bookings/b1', headers: auth() })
    expect(res.json().conductor).toBeNull()
  })
})
