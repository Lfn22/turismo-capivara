import { describe, it, expect, vi, afterEach } from 'vitest'
import sitemap from './sitemap'

describe('sitemap', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('inclui os destinos vindos da resposta paginada da API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          // Formato de paginatedResponse() em apps/api/src/shared/utils/pagination.ts
          new Response(
            JSON.stringify({
              data: [{ id: 'd1', slug: 'serra-da-capivara' }],
              nextCursor: null,
              hasMore: false,
            }),
            { status: 200 },
          ),
      ),
    )

    const routes = await sitemap()

    expect(routes.map((r) => r.url)).toContainEqual(
      expect.stringMatching(/\/destinos\/serra-da-capivara$/),
    )
  })
})
