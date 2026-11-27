import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const push = vi.fn()
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u1', role: 'ADMIN' } } }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn(), back: vi.fn() }),
  useParams: () => ({ slug: 'agencia-x' }),
}))

import NovoRoteiroPage from './page'

describe('NovoRoteiroPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    push.mockClear()
  })

  it('envia o valor do grupo sem capacidade e sem texto "por pessoa"', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const { container } = render(<NovoRoteiroPage />)

    expect(screen.queryByText(/Capacidade máxima/)).toBeNull()
    expect(container.textContent).not.toMatch(/por pessoa/)

    fireEvent.change(screen.getByLabelText('Nome do roteiro'), { target: { value: 'Trilha' } })
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Uma trilha' } })
    fireEvent.change(screen.getByLabelText('Valor do grupo (R$)'), { target: { value: '600' } })
    fireEvent.change(screen.getByLabelText('Duração (horas)'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar roteiro' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }]
    expect(url).toBe('/api/tenants/agencia-x/packages')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({ price: 600, extraGuidePrice: null, photos: [], highlights: [] })
    expect(body).not.toHaveProperty('capacity')
  })

  it('bloqueia destaque curto demais', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<NovoRoteiroPage />)
    fireEvent.change(screen.getByLabelText('Nome do roteiro'), { target: { value: 'Trilha' } })
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Uma trilha' } })
    fireEvent.change(screen.getByLabelText('Valor do grupo (R$)'), { target: { value: '600' } })
    fireEvent.change(screen.getByLabelText('Duração (horas)'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar destaque' }))
    fireEvent.change(screen.getByLabelText('Destaque 1'), { target: { value: 'abc' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar roteiro' }))
    expect(
      await screen.findByText('Cada destaque deve ter entre 5 e 200 caracteres.'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
