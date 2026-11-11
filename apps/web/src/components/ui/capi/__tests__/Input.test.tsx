import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Input } from '../Input'

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('renders input with correct type', () => {
    render(<Input label="Senha" type="password" />)
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password')
  })

  it('shows error message with alert role', () => {
    render(<Input label="Nome" error="Campo obrigatório" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Campo obrigatório')
  })

  it('marks input as aria-invalid on error', () => {
    render(<Input label="CPF" id="cpf" error="CPF inválido" />)
    const input = screen.getByLabelText('CPF')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'cpf-err')
  })

  it('shows optional marker', () => {
    render(<Input label="Telefone" optional />)
    expect(screen.getByText('(opcional)')).toBeInTheDocument()
  })

  it('shows hint text', () => {
    render(<Input label="Email" id="email" hint="Usaremos para enviar o voucher" />)
    expect(screen.getByText('Usaremos para enviar o voucher')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-describedby', 'email-hint')
  })

  it('applies is-invalid class on error', () => {
    const { container } = render(<Input label="Nome" error="Erro" />)
    expect(container.querySelector('.capi-field')).toHaveClass('is-invalid')
  })
})
