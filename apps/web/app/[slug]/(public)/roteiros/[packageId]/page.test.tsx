import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/agencia-x/roteiros/p1',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}))

import RoteiroPage from './page'

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 })
}

describe('Roteiro (público) — bloco "Seu guia"', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('mostra o condutor achado pelo User.id na lista de guias do roteiro', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/tenants/agencia-x/packages/p1')) {
          return json({
            id: 'p1',
            name: 'Trilha',
            description: 'd',
            duration: 4,
            price: '150',
            difficulty: 'EASY',
            conductorId: 'u1',
            departureSlots: [],
            photos: [],
            highlights: [],
          })
        }
        if (url.endsWith('/packages/p1/guides')) {
          return json([
            {
              guideId: 'gp1',
              userId: 'u1',
              name: 'Ana Condutora',
              photoUrl: null,
              especialidades: [],
            },
          ])
        }
        return new Response('{}', { status: 404 })
      }),
    )

    render(await RoteiroPage({ params: Promise.resolve({ slug: 'agencia-x', packageId: 'p1' }) }))

    expect(screen.getByText('Seu guia')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Ana Condutora[\s\S]*Guia verificado/ }),
    ).toHaveAttribute('href', '/agencia-x/guias/gp1')
  })
})
