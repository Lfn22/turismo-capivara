import { describe, it, expect, vi, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { GET } from './route'

afterEach(() => vi.unstubAllGlobals())

describe('GET /api/tenants/[slug]/packages/[packageId]', () => {
  it('codifica slug e packageId na URL da API', async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await GET({} as NextRequest, {
      params: Promise.resolve({ slug: 'a/b', packageId: '../x?y' }),
    })

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/tenants\/a%2Fb\/packages\/\.\.%2Fx%3Fy$/)
  })
})
