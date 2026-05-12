/**
 * tenants.test.ts
 * Integration tests for GET /tenants — validates [S1] ADMIN-only guard.
 *
 * Uses Fastify inject (no real HTTP) + Prisma mocked with vi.mock.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp, TEST_JWT_SECRET } from './helpers/build-app'
import { tenantsRoutes } from '../modules/tenants/tenants.routes'

// ---------------------------------------------------------------------------
// Prisma mock — must be hoisted before any imports that use the module
// ---------------------------------------------------------------------------
vi.mock('../database', () => ({
  default: {
    tenant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

// Typed reference to mocked prisma
import prisma from '../database'
const prismaMock = prisma as unknown as {
  tenant: { findMany: Mock; findUnique: Mock }
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = buildApp(tenantsRoutes)

let adminToken: string
let conductorToken: string

beforeAll(async () => {
  await app.ready()
  adminToken = app.jwt.sign({ sub: 'admin-1', role: 'ADMIN', tenantId: 'tenant-1', name: 'Admin' })
  conductorToken = app.jwt.sign({ sub: 'guide-1', role: 'CONDUTOR', tenantId: 'tenant-1', name: 'Guide' })
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /tenants — [S1] ADMIN-only guard', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await app.inject({ method: 'GET', url: '/tenants' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 403 when token role is CONDUTOR (not ADMIN)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenants',
      headers: { Authorization: `Bearer ${conductorToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 200 and tenant list when token role is ADMIN', async () => {
    prismaMock.tenant.findMany.mockResolvedValue([
      { id: 'tenant-1', slug: 'capivara', name: 'Serra da Capivara' },
    ])

    const res = await app.inject({
      method: 'GET',
      url: '/tenants',
      headers: { Authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<unknown[]>()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(1)
    expect(prismaMock.tenant.findMany).toHaveBeenCalledTimes(1)
  })

  it('returns 401 (not 200) for an expired/invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenants',
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /tenants/:slug — public endpoint (no auth required)', () => {
  it('returns 200 for existing slug without a token', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: 'tenant-1',
      slug: 'capivara',
      name: 'Serra da Capivara',
    })

    const res = await app.inject({ method: 'GET', url: '/tenants/capivara' })
    expect(res.statusCode).toBe(200)
    expect(res.json<{ slug: string }>().slug).toBe('capivara')
  })

  it('returns 404 for an unknown slug', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(null)

    const res = await app.inject({ method: 'GET', url: '/tenants/unknown' })
    expect(res.statusCode).toBe(404)
  })
})
