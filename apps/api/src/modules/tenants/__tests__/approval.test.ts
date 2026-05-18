/**
 * approval.test.ts
 * Integration tests for PATCH /tenants/:id/approve and PATCH /tenants/:id/reject
 * Uses Fastify inject + vi.mock for prisma and resend
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from '../../../__tests__/helpers/build-app'
import { tenantsRoutes } from '../tenants.routes'

// ---------------------------------------------------------------------------
// Mock prisma
// ---------------------------------------------------------------------------
vi.mock('../../../database', () => ({
  default: {
    tenant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Mock resend — no real emails in tests
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ id: 'mock-email-id' }) },
  })),
}))

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  hashSync: vi.fn().mockReturnValue('hashed-password'),
}))

import prisma from '../../../database'
const prismaMock = prisma as unknown as {
  $transaction: Mock
  tenant: { findMany: Mock; findUnique: Mock; create: Mock; update: Mock }
  user: { create: Mock }
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = buildApp(tenantsRoutes)

let superAdminToken: string
let adminToken: string

beforeAll(async () => {
  await app.ready()
  superAdminToken = app.jwt.sign({ sub: 'super-1', role: 'SUPER_ADMIN', tenantId: 'platform', name: 'Super Admin' })
  adminToken = app.jwt.sign({ sub: 'admin-1', role: 'ADMIN', tenantId: 'tenant-1', name: 'Admin' })
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  vi.clearAllMocks()
})

const mockTenant = {
  id: 'tenant-abc',
  name: 'Capivara Tours',
  slug: 'capivara-tours',
  approvalStatus: 'PENDING',
  rejectionReason: null,
  createdAt: new Date(),
  users: [{ email: 'admin@capivara.com', name: 'Capivara Admin' }],
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Tenant approval', () => {
  it('PATCH /tenants/:id/approve by SUPER_ADMIN returns 200', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(mockTenant)
    prismaMock.tenant.update.mockResolvedValue({ ...mockTenant, approvalStatus: 'APPROVED' })

    const res = await app.inject({
      method: 'PATCH',
      url: '/tenants/tenant-abc/approve',
      headers: { Authorization: `Bearer ${superAdminToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json<{ message: string }>().message).toBe('Operadora aprovada com sucesso')
    expect(prismaMock.tenant.findUnique).toHaveBeenCalledTimes(1)
    expect(prismaMock.tenant.update).toHaveBeenCalledTimes(1)
  })

  it('PATCH /tenants/:id/approve by ADMIN (non-SUPER_ADMIN) returns 403', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/tenants/tenant-abc/approve',
      headers: { Authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(403)
  })

  it('PATCH /tenants/:id/reject by SUPER_ADMIN with reason returns 200', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(mockTenant)
    prismaMock.tenant.update.mockResolvedValue({ ...mockTenant, approvalStatus: 'REJECTED', rejectionReason: 'Documentação inválida' })

    const res = await app.inject({
      method: 'PATCH',
      url: '/tenants/tenant-abc/reject',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      payload: { reason: 'Documentação inválida' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json<{ message: string }>().message).toBe('Operadora rejeitada')
    expect(prismaMock.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ approvalStatus: 'REJECTED', rejectionReason: 'Documentação inválida' }),
      }),
    )
  })
})
