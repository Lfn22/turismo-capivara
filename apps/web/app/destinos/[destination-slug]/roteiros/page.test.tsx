import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next-auth/react', () => ({
  useSession: () => ({ status: 'unauthenticated', data: null }),
}))
vi.mock('next/navigation', () => ({ usePathname: () => '/destinos/serra/roteiros' }))

import RoteirosPage from './page'

const COVER = 'https://pub-x.r2.dev/packages/capa.jpg'

describe('Roteiros do destino', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('mostra a foto de capa que a API devolve (coverPhotoUrl)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        String(url).endsWith('/packages')
          ? new Response(
              JSON.stringify([
                {
                  id: 'p1',
                  name: 'Circuito do Desfiladeiro',
                  description: '',
                  duration: 6,
                  price: 400,
                  difficulty: 'HARD',
                  durationMinHours: null,
                  durationMaxHours: null,
                  coverPhotoUrl: COVER,
                  tenantSlug: 'op',
                },
              ]),
              { status: 200 },
            )
          : new Response(JSON.stringify({ title: 'Serra' }), { status: 200 }),
      ),
    )

    render(await RoteirosPage({ params: Promise.resolve({ 'destination-slug': 'serra' }) }))

    const img = screen.getByRole('img', { name: /circuito do desfiladeiro/i })
    expect(decodeURIComponent(img.getAttribute('src') ?? '')).toContain(COVER)
  })
})
