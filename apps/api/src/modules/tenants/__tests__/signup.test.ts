/**
 * signup.test.ts
 * Integration tests for POST /tenants/signup
 * Uses Fastify inject + vi.mock for prisma and bcryptjs
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from '../../../__tests__/helpers/build-app'
import { tenantsRoutes } from '../tenants.routes'

// ---------------------------------------------------------------------------
// Mock prisma — must be hoisted before imports that use the module
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

// Mock bcryptjs — speed up tests
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
describe('POST /tenants/signup', () => {
  it('returns 201 with valid body', async () => {
    prismaMock.$transaction.mockResolvedValue(undefined)

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/signup',
      payload: {
        name: 'Capivara Tours',
        slug: 'capivara-tours',
        email: 'admin@capivara.com',
        password: 'senha123',
        cnpj: '12.345.678/0001-99',
      },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json<{ message: string }>().message).toBe('Operadora cadastrada com sucesso')
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
  })

  it('returns 409 with duplicate slug', async () => {
    const { Prisma } = await import('@prisma/client')
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002',
      clientVersion: '7.0.0',
    })
    prismaMock.$transaction.mockRejectedValue(p2002)

    const res = await app.inject({
      method: 'POST',
      url: '/tenants/signup',
      payload: {
        name: 'Capivara Tours',
        slug: 'existing-slug',
        email: 'admin@capivara.com',
        password: 'senha123',
        cnpj: '12.345.678/0001-99',
      },
    })

    expect(res.statusCode).toBe(409)
    expect(res.json<{ message: string }>().message).toBe('Slug já em uso')
  })

  it('returns 400 with invalid body (short password)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tenants/signup',
      payload: {
        name: 'Capivara Tours',
        slug: 'capivara-tours',
        email: 'admin@capivara.com',
        password: '123',
      },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ message: string; errors: Array<{ field: string; message: string }> }>()
    expect(body.message).toBe('Dados inválidos')
    expect(Array.isArray(body.errors)).toBe(true)
    expect(body.errors.some((e) => e.field === 'password')).toBe(true)
  })
})
