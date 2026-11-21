import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PerfilPage from '../page'

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}))

import { signOut } from 'next-auth/react'

const mockProfile = {
  id: 'usr1',
  name: 'João Silva',
  email: 'joao@example.com',
  photoUrl: '',
  cpf: '123.456.789-00',
  createdAt: '2024-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.mocked(signOut).mockClear()
})

describe('PerfilPage', () => {
  it('exibe estado de carregamento inicialmente', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile,
    } as Response)
    render(<PerfilPage />)
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('exibe nome e email do perfil', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile,
    } as Response)
    render(<PerfilPage />)
    await waitFor(() => expect(screen.getByLabelText('Nome')).toBeInTheDocument())
    expect(screen.getByLabelText('Nome')).toHaveValue('João Silva')
    expect(screen.getByLabelText('E-mail')).toHaveValue('joao@example.com')
    expect(screen.getByLabelText('E-mail')).toBeDisabled()
  })

  it('exibe botão salvar', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile,
    } as Response)
    render(<PerfilPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument())
  })

  it('exibe mensagem de sucesso após salvar', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => mockProfile } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)
    render(<PerfilPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(screen.getByText('Perfil atualizado!')).toBeInTheDocument())
  })

  it('exibe mensagem de erro quando PATCH falha', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => mockProfile } as Response)
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response)
    render(<PerfilPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Erro ao salvar. Tente novamente.'),
    )
  })

  it('chama signOut ao clicar em Sair da conta', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile,
    } as Response)
    render(<PerfilPage />)
    await waitFor(() => expect(screen.getByText('Sair da conta')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Sair da conta'))
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' })
  })

  it('exibe inicial do nome no avatar quando não há foto', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockProfile, photoUrl: '' }),
    } as Response)
    render(<PerfilPage />)
    await waitFor(() => expect(screen.getByText('J')).toBeInTheDocument())
  })
})
