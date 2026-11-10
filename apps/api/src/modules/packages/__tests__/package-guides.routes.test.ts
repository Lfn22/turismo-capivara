import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from '../../../__tests__/helpers/build-app'
import { packagesRoutes } from '../packages.routes'

vi.mock('../../../database', () => ({
  default: {
    tourPackage: { findFirst: vi.fn() },
    packageGuide: { findMany: vi.fn() },
  },
}))

vi.mock('../../notifications/guide-events', () => ({
  notifyGuideJoinedPackage: vi.fn().mockResolvedValue(undefined),
}))

import prisma from '../../../database'
const prismaMock = prisma as unknown as { packageGuide: { findMany: Mock }; tourPackage: { findFirst: Mock } }

const app = buildApp(packagesRoutes)

beforeAll(async () => {
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /packages/:id/guides', () => {
  it('lista só guias aceitos no roteiro e com cadastro aprovado', async () => {
    prismaMock.tourPackage.findFirst.mockResolvedValue({ id: 'pkg-1' })
    prismaMock.packageGuide.findMany.mockResolvedValue([])

    const res = await app.inject({ method: 'GET', url: '/packages/pkg-1/guides' })

    expect(res.statusCode).toBe(200)
    expect(prismaMock.packageGuide.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          packageId: 'pkg-1',
          status: 'ACCEPTED',
          guide: { user: { approvalStatus: 'APPROVED' } },
        },
      }),
    )
  })
})

describe('rota antiga POST /tenants/:slug/packages/:id/guides/me', () => {
  it('saiu: responde 404', async () => {
    const res = await app.inject({ method: 'POST', url: '/tenants/capivara/packages/p1/guides/me' })
    expect(res.statusCode).toBe(404)
  })
})
