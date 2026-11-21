import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }))

import CadastroForm from '../CadastroForm'

describe('CadastroForm', () => {
  it('renderiza campos obrigatórios', () => {
    render(<CadastroForm />)
    expect(screen.getByLabelText(/nome/i)).toBeTruthy()
    expect(screen.getByLabelText(/e-mail/i)).toBeTruthy()
    expect(screen.getByLabelText(/^senha$/i)).toBeTruthy()
    expect(screen.getByLabelText(/confirmar senha/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeTruthy()
  })

  it('mostra link para login', () => {
    render(<CadastroForm />)
    const link = screen.getByRole('link', { name: /entrar/i })
    expect(link).toBeTruthy()
    expect((link as HTMLAnchorElement).href).toContain('/login')
  })

  it('exibe erro se senhas não coincidem', async () => {
    render(<CadastroForm />)

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Maria Silva' } })
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'maria@example.com' } })
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'senha123' } })
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: 'outrasenha' } })

    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }))

    expect(await screen.findByText(/senhas não coincidem/i)).toBeTruthy()
  })
})
