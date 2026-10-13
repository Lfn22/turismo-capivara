/**
 * guides.test.ts
 * Integration tests for guides routes.
 *
 * Tests:
 *  - GET /tenants/:slug/guides with nonexistent tenant → 404
 *  - GET /tenants/:slug/guides/:id with nonexistent guide → 404
 *  - GET /tenants/:slug/admin/guides without auth → 401
 *  - PATCH /tenants/:slug/admin/guides/:id/approve without auth → 401
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from './helpers/build-app'
import { guidesRoutes } from '../modules/guides/guides.routes'

// ---------------------------------------------------------------------------
// Prisma mock — must be hoisted before any imports that use the module
// ---------------------------------------------------------------------------
vi.mock('../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    guideProfile: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}))

import prisma from '../database'
const db = prisma as unknown as {
  tenant: { findUnique: Mock }
  guideProfile: { findMany: Mock; findFirst: Mock }
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = buildApp(guidesRoutes)

beforeAll(async () => {
  await app.ready()
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
describe('GET /tenants/:slug/guides — public list', () => {
  it('returns 404 when tenant does not exist', async () => {
    db.tenant.findUnique.mockResolvedValue(null)

    const res = await app.inject({ method: 'GET', url: '/tenants/nao-existe/guides' })

    expect(res.statusCode).toBe(404)
  })
})

describe('GET /tenants/:slug/guides/:id — public single guide', () => {
  it('returns 404 when guide does not exist', async () => {
    db.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', slug: 'capivara' })
    db.guideProfile.findFirst.mockResolvedValue(null)

    const res = await app.inject({ method: 'GET', url: '/tenants/capivara/guides/guide-nao-existe' })

    expect(res.statusCode).toBe(404)
  })
})

describe('GET /tenants/:slug/admin/guides — ADMIN only', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await app.inject({ method: 'GET', url: '/tenants/capivara/admin/guides' })

    expect(res.statusCode).toBe(401)
  })
})

describe('PATCH /tenants/:slug/admin/guides/:id/approve — ADMIN only', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/tenants/capivara/admin/guides/guide-1/approve' })

    expect(res.statusCode).toBe(401)
  })
})
