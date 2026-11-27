import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import PedidosClient from '../PedidosClient'

const proxy = (path: string) => `/api/proxy?path=${encodeURIComponent(path)}`

function pedido(over: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    type: 'UPDATE',
    status: 'PENDING',
    createdAt: '2026-11-20T12:00:00.000Z',
    changes: { price: { from: 600, to: 700 } },
    package: {
      id: 'p1',
      name: 'Trilha da Pedra',
      description: 'd',
      price: 600,
      extraGuidePrice: null,
      active: true,
      publishedAt: '2026-01-01T00:00:00.000Z',
      tenantSlug: 'capi',
      destinationTitle: 'Chapada',
    },
    requestedBy: { id: 'u1', name: 'Maria Guia' },
    ...over,
  }
}

function mockFetch(requests: unknown[], onPost?: (url: string, init?: RequestInit) => Response) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      return onPost ? onPost(url, init) : Response.json({ id: 'r1', status: 'APPROVED' })
    }
    return Response.json({ requests })
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('PedidosClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('lista vazia mostra mensagem', async () => {
    mockFetch([])
    render(<PedidosClient />)
    expect(await screen.findByText('Nenhum pedido pendente.')).toBeInTheDocument()
  })

  it('renderiza UPDATE com Campo, Antes e Depois', async () => {
    const fn = mockFetch([pedido()])
    render(<PedidosClient />)
    expect(await screen.findByText('Alteração')).toBeInTheDocument()
    const row = screen.getByText('Valor do grupo').closest('tr')!
    expect(row).toHaveTextContent('R$ 600,00')
    expect(row).toHaveTextContent('R$ 700,00')
    expect(screen.getByRole('link', { name: 'Trilha da Pedra' })).toHaveAttribute(
      'href',
      '/capi/roteiros/p1',
    )
    expect(screen.getByText(/Maria Guia/)).toBeInTheDocument()
    expect(fn).toHaveBeenCalledWith(proxy('/admin/package-requests?status=PENDING'))
    expect(screen.queryByText(/Atual:/)).not.toBeInTheDocument()
  })

  it('destaca valor atual quando difere do "Antes"', async () => {
    mockFetch([pedido({ package: { ...pedido().package, price: 650 } })])
    render(<PedidosClient />)
    expect(await screen.findByText('Atual: R$ 650,00')).toBeInTheDocument()
  })

  it('null em acréscimo vira "sem acréscimo"', async () => {
    mockFetch([pedido({ changes: { extraGuidePrice: { from: 50, to: null } } })])
    render(<PedidosClient />)
    expect(await screen.findByText('Acréscimo por guia extra')).toBeInTheDocument()
    expect(screen.getByText('sem acréscimo')).toBeInTheDocument()
  })

  it('arquivamento mostra aviso de cancelamento', async () => {
    mockFetch([pedido({ type: 'ARCHIVE', changes: null })])
    render(<PedidosClient />)
    expect(await screen.findByText('Arquivamento')).toBeInTheDocument()
    expect(
      screen.getByText('Ao aprovar, as reservas futuras serão canceladas e estornadas.'),
    ).toBeInTheDocument()
  })

  it('Aprovar chama o POST e remove o item', async () => {
    const fn = mockFetch([pedido()])
    render(<PedidosClient />)
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }))
    await waitFor(() => expect(screen.getByText('Nenhum pedido pendente.')).toBeInTheDocument())
    expect(fn).toHaveBeenCalledWith(
      proxy('/admin/package-requests/r1/approve'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('erro 409 mostra mensagem e mantém o item', async () => {
    mockFetch([pedido()], () =>
      Response.json({ message: 'Este pedido já foi decidido.' }, { status: 409 }),
    )
    render(<PedidosClient />)
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }))
    expect(await screen.findByText('Este pedido já foi decidido.')).toBeInTheDocument()
    expect(screen.getByText('Trilha da Pedra')).toBeInTheDocument()
  })

  it('Recusar exige motivo e envia { reason }', async () => {
    const fn = mockFetch([pedido()])
    render(<PedidosClient />)
    fireEvent.click(await screen.findByRole('button', { name: 'Recusar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar recusa' }))
    expect(fn.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)

    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'Fotos ruins' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar recusa' }))
    await waitFor(() => expect(screen.getByText('Nenhum pedido pendente.')).toBeInTheDocument())
    const post = fn.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(post[0]).toBe(proxy('/admin/package-requests/r1/reject'))
    expect(JSON.parse(post[1]!.body as string)).toEqual({ reason: 'Fotos ruins' })
  })

  it('PUBLISH mostra descrição e valores e linka para a lista de roteiros da operadora', async () => {
    mockFetch([
      pedido({
        type: 'PUBLISH',
        changes: null,
        package: { ...pedido().package, description: 'Trilha longa', publishedAt: null },
      }),
    ])
    render(<PedidosClient />)
    expect(await screen.findByText('Entrada no ar')).toBeInTheDocument()
    expect(screen.getByText('Trilha longa')).toBeInTheDocument()
    expect(screen.getByText('Valor do grupo: R$ 600,00')).toBeInTheDocument()
    expect(screen.getByText('Acréscimo por guia extra: sem acréscimo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Trilha da Pedra' })).toHaveAttribute(
      'href',
      '/super-admin/roteiros?operadora=capi',
    )
    expect(screen.queryByText('Roteiro já publicado')).not.toBeInTheDocument()
  })

  it('arquivamento também mostra os valores e mantém o link público', async () => {
    mockFetch([
      pedido({
        type: 'ARCHIVE',
        changes: null,
        package: { ...pedido().package, extraGuidePrice: 300 },
      }),
    ])
    render(<PedidosClient />)
    expect(await screen.findByText('Acréscimo por guia extra: R$ 300,00')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Trilha da Pedra' })).toHaveAttribute(
      'href',
      '/capi/roteiros/p1',
    )
  })

  it('PUBLISH de roteiro que já está no ar mostra "Roteiro já publicado"', async () => {
    mockFetch([pedido({ type: 'PUBLISH', changes: null })])
    render(<PedidosClient />)
    expect(await screen.findByText('Roteiro já publicado')).toBeInTheDocument()
  })
})
