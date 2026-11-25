import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next-auth/react', () => ({
  useSession: () => ({ status: 'unauthenticated', data: null }),
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/destinos/serra',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  notFound: () => {
    throw new Error('notFound')
  },
}))
const mapProps = vi.fn()
vi.mock('@/src/components/ui/map', () => ({
  MapWidgetClient: (props: { markers: unknown[] }) => {
    mapProps(props)
    return null
  },
}))
vi.mock('@/src/components/membership/DestinationMembershipButton', () => ({ default: () => null }))
vi.mock('@/src/components/layout/StickyDestinationNav', () => ({ default: () => null }))
vi.mock('@/src/components/leads/LeadForm', () => ({ LeadForm: () => null }))
vi.mock('@/src/components/tracking/TrackView', () => ({ TrackView: () => null }))

import DestinationPage from './page'

describe('Página do destino — roteiros', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('preço do card em reais (R$ 400, não R$ 4) e o mapa recebe o valor em reais', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const u = String(url)
        if (u.endsWith('/packages')) {
          return new Response(
            JSON.stringify([
              {
                id: 'p1',
                name: 'Circuito do Desfiladeiro',
                duration: 6,
                price: 400,
                difficulty: 'HARD',
                coverPhotoUrl: null,
                lat: -8.8,
                lng: -42.5,
                tenantSlug: 'op',
              },
            ]),
            { status: 200 },
          )
        }
        if (u.endsWith('/destinations/serra')) {
          return new Response(
            JSON.stringify({
              id: 'd1',
              slug: 'serra',
              title: 'Serra',
              state: 'PI',
              lat: -8.8,
              lng: -42.5,
              photos: [],
              highlights: [],
              partners: [],
            }),
            { status: 200 },
          )
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 })
      }),
    )

    render(await DestinationPage({ params: Promise.resolve({ 'destination-slug': 'serra' }) }))

    const card = screen.getAllByText('Circuito do Desfiladeiro')[0].closest('a')!
    expect(card.textContent).toMatch(/R\$\s*400/)
    const markers = mapProps.mock.calls.at(-1)?.[0].markers as Array<{ price?: number }>
    expect(markers.find((m) => m.price != null)?.price).toBe(400)
  })
})
