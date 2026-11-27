import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import JoinableRoteiros from '../JoinableRoteiros'

vi.mock('@/src/components/membership/PackageJoinButton', () => ({
  default: ({ packageId }: { packageId: string }) => <button>Quero atuar {packageId}</button>,
}))

function stubApi(memberships: unknown, packagesBySlug: Record<string, unknown[]>) {
  const fetchMock = vi.fn(async (url: string) => {
    const path = decodeURIComponent(url.split('path=')[1] ?? '')
    if (path === '/guides/me/memberships') return new Response(JSON.stringify(memberships))
    const m = path.match(/^\/destinations\/([^/]+)\/packages$/)
    if (m) return new Response(JSON.stringify(packagesBySlug[m[1]] ?? []))
    return new Response('{}', { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
}

describe('JoinableRoteiros', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lista roteiros dos destinos do guia, sem os dele, com o botão de atuar', async () => {
    stubApi(
      {
        conductorPackageIds: ['meu'],
        destinations: [{ slug: 'serra', title: 'Serra da Capivara' }],
      },
      {
        serra: [
          { id: 'meu', name: 'Meu roteiro', price: 600, tenantSlug: 't1' },
          { id: 'outro', name: 'Trilha do Boqueirão', price: 800, tenantSlug: 't2' },
        ],
      },
    )
    render(<JoinableRoteiros />)

    const link = await screen.findByRole('link', { name: 'Trilha do Boqueirão' })
    expect(link).toHaveAttribute('href', '/t2/roteiros/outro')
    expect(screen.getByText('Serra da Capivara')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quero atuar outro' })).toBeInTheDocument()
    expect(screen.queryByText('Meu roteiro')).not.toBeInTheDocument()
    expect(screen.getByText(/R\$\s*800,00/)).toBeInTheDocument()
  })

  it('sem destinos, convida o guia a escolher um destino', async () => {
    stubApi({ conductorPackageIds: [], destinations: [] }, {})
    render(<JoinableRoteiros />)

    expect(await screen.findByText(/Você ainda não atua em nenhum destino/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Escolha um destino' })).toHaveAttribute(
      'href',
      '/destinos',
    )
  })

  it('com destinos mas sem outros roteiros, avisa que não há roteiros', async () => {
    stubApi(
      { conductorPackageIds: ['meu'], destinations: [{ slug: 'serra', title: 'Serra' }] },
      { serra: [{ id: 'meu', name: 'Meu roteiro', price: 600, tenantSlug: 't1' }] },
    )
    render(<JoinableRoteiros />)

    expect(
      await screen.findByText('Nenhum outro roteiro publicado nos seus destinos.'),
    ).toBeInTheDocument()
  })
})
