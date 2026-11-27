import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from '../../__tests__/helpers/build-app'

vi.mock('../../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    destination: { findUnique: vi.fn(), findFirst: vi.fn() },
    guideProfile: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}))
vi.mock('./destinations.service', () => ({
  createDestination: vi.fn(),
  updateDestination: vi.fn(),
  deleteDestination: vi.fn(),
  approveDestination: vi.fn(),
  rejectDestination: vi.fn(),
}))

import prisma from '../../database'
import { destinationsRoutes } from './destinations.routes'
import { destinationMembershipRoutes } from '../memberships/destination-membership.routes'

const db = prisma as unknown as Record<string, Record<string, Mock>>
// Os dois plugins juntos: prova que /:slug/guides/:guideId e /:destinationSlug/guides/me coexistem
const app = buildApp(destinationsRoutes, destinationMembershipRoutes)
beforeAll(async () => {
  await app.ready()
})
afterAll(async () => {
  await app.close()
})
beforeEach(() => {
  vi.clearAllMocks()
  db.destination.findUnique.mockResolvedValue({ id: 'd1' })
})

describe('listagens públicas de guias usam GuideDestination', () => {
  it('GET /destinations/:slug/guides filtra por destinations.some.destinationId', async () => {
    db.guideProfile.findMany.mockResolvedValue([])
    const res = await app.inject({ method: 'GET', url: '/destinations/serra-azul/guides' })
    expect(res.statusCode).toBe(200)
    const where = db.guideProfile.findMany.mock.calls[0][0].where
    expect(where.destinations).toEqual({ some: { destinationId: 'd1' } })
    expect(where.user).toEqual({ role: 'CONDUTOR', approvalStatus: 'APPROVED' })
  })

  it('GET /destinations/:slug/guides/:guideId idem', async () => {
    db.guideProfile.findFirst.mockResolvedValue(null)
    const res = await app.inject({ method: 'GET', url: '/destinations/serra-azul/guides/g9' })
    expect(res.statusCode).toBe(404)
    const where = db.guideProfile.findFirst.mock.calls[0][0].where
    expect(where.id).toBe('g9')
    expect(where.destinations).toEqual({ some: { destinationId: 'd1' } })
    expect(where.user).toEqual({ role: 'CONDUTOR', approvalStatus: 'APPROVED' })
  })

  it('GET /destinations/:slug/guides/:guideId traz available e maxPax nos horários', async () => {
    db.guideProfile.findFirst.mockResolvedValue({
      id: 'g9',
      photoUrl: null,
      bio: null,
      especialidades: [],
      regioes: [],
      portfolioPhotos: [],
      user: {
        name: 'Guia',
        tenant: { slug: 't' },
        tourPackages: [
          {
            id: 'p1',
            name: 'Trilha',
            description: null,
            duration: null,
            price: '600',
            extraGuidePrice: '400',
            difficulty: null,
            departureSlots: [
              {
                id: 's1',
                startsAt: new Date(),
                booked: 0,
                status: 'OPEN',
                minCapacity: 1,
                maxGuides: 2,
              },
            ],
          },
        ],
      },
    })
    const res = await app.inject({ method: 'GET', url: '/destinations/serra-azul/guides/g9' })
    expect(res.statusCode).toBe(200)
    expect(res.json().packages[0].departureSlots[0]).toMatchObject({
      id: 's1',
      available: true,
      maxPax: 16,
    })
  })
})
