import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import GuiasPage from './page'

describe('GuiasPage (pública da operadora)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lista os guias vindos da resposta paginada da API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          // Formato de paginatedResponse() em apps/api/src/shared/utils/pagination.ts
          new Response(
            JSON.stringify({
              data: [
                {
                  id: 'g1',
                  bio: null,
                  photoUrl: null,
                  especialidades: [],
                  regioes: [],
                  user: { id: 'u1', name: 'Ana Guia' },
                },
              ],
              nextCursor: null,
              hasMore: false,
            }),
            { status: 200 },
          ),
      ),
    )

    render(await GuiasPage({ params: Promise.resolve({ slug: 'agencia-x' }) }))

    expect(screen.getByText('Ana Guia')).toBeInTheDocument()
  })
})
