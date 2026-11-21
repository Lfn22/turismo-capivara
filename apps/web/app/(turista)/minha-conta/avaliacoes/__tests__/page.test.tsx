import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AvaliacoesPage from '../page'

const mockReviews = [
  {
    id: 'rev1',
    rating: 4,
    comment: 'Ótimo passeio!',
    packageName: 'Trilha da Serra',
    packageCoverUrl: '',
    createdAt: '2024-03-15T10:00:00Z',
  },
  {
    id: 'rev2',
    rating: 5,
    comment: '',
    packageName: 'Cachoeira Azul',
    packageCoverUrl: '',
    createdAt: '2024-02-10T10:00:00Z',
  },
]

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('AvaliacoesPage', () => {
  it('exibe estado de carregamento inicialmente', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response)
    render(<AvaliacoesPage />)
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('exibe empty state quando não há avaliações', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response)
    render(<AvaliacoesPage />)
    await waitFor(() => expect(screen.getByText('Nenhuma avaliação')).toBeInTheDocument())
    expect(screen.getByText('Ver viagens')).toBeInTheDocument()
  })

  it('exibe lista de avaliações', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockReviews }),
    } as Response)
    render(<AvaliacoesPage />)
    await waitFor(() => expect(screen.getByText('Trilha da Serra')).toBeInTheDocument())
    expect(screen.getByText('Cachoeira Azul')).toBeInTheDocument()
    expect(screen.getByText('Ótimo passeio!')).toBeInTheDocument()
  })

  it('exibe 5 estrelas por avaliação', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockReviews[0]] }),
    } as Response)
    render(<AvaliacoesPage />)
    await waitFor(() => expect(screen.getByText('Trilha da Serra')).toBeInTheDocument())
    expect(screen.getByLabelText('4 de 5 estrelas')).toBeInTheDocument()
  })

  it('trata erro de fetch sem quebrar', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network'))
    render(<AvaliacoesPage />)
    await waitFor(() => expect(screen.queryByText('Carregando...')).not.toBeInTheDocument())
    expect(screen.getByText('Nenhuma avaliação')).toBeInTheDocument()
  })

  it('CTA "Ver viagens" aponta para /minha-conta/viagens', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response)
    render(<AvaliacoesPage />)
    await waitFor(() => expect(screen.getByText('Ver viagens')).toBeInTheDocument())
    expect(screen.getByText('Ver viagens').closest('a')).toHaveAttribute(
      'href',
      '/minha-conta/viagens',
    )
  })
})
