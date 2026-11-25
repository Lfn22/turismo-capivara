import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

import GuideProfilePage from './page'

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 })
}

describe('GuideProfilePage (pública da operadora)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lista os roteiros do guia vindos da resposta paginada da API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        // conductorId é o User.id do guia (u1), não o GuideProfile.id da URL (g1)
        if (url.includes('/packages?conductorId=u1')) {
          // Formato de paginatedResponse() em apps/api/src/shared/utils/pagination.ts
          return json({
            data: [
              {
                id: 'p1',
                name: 'Trilha do Boqueirão',
                description: 'Pinturas rupestres',
                duration: 4,
                price: '150',
                difficulty: 'EASY',
                departureSlots: [],
              },
            ],
            nextCursor: null,
            hasMore: false,
          })
        }
        return json({
          guide: {
            id: 'g1',
            bio: null,
            photoUrl: null,
            especialidades: [],
            regioes: [],
            portfolioPhotos: [],
            user: { id: 'u1', name: 'Ana Guia', approvalStatus: 'APPROVED' },
          },
        })
      }),
    )

    render(
      await GuideProfilePage({ params: Promise.resolve({ slug: 'agencia-x', guideId: 'g1' }) }),
    )

    expect(screen.getByText('Trilha do Boqueirão')).toBeInTheDocument()
  })
})
