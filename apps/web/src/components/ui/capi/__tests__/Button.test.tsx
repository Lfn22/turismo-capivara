import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../Button'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Reservar</Button>)
    expect(screen.getByRole('button', { name: /reservar/i })).toBeInTheDocument()
  })

  it('applies variant class', () => {
    render(<Button variant="danger">Excluir</Button>)
    expect(screen.getByRole('button')).toHaveClass('capi-btn--danger')
  })

  it('applies size class', () => {
    render(<Button size="lg">Grande</Button>)
    expect(screen.getByRole('button')).toHaveClass('capi-btn--lg')
  })

  it('is disabled and aria-busy when loading', () => {
    render(<Button loading>Salvando</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
  })

  it('renders as link when href provided', () => {
    render(<Button href="/destinos">Ver destinos</Button>)
    const link = screen.getByRole('link', { name: /ver destinos/i })
    expect(link).toHaveAttribute('href', '/destinos')
    expect(link).toHaveClass('capi-btn')
  })

  it('renders external link with rel', () => {
    render(
      <Button href="https://example.com" target="_blank">
        Externo
      </Button>,
    )
    const link = screen.getByRole('link', { name: /externo/i })
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('calls onClick handler', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Clique</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Clique
      </Button>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('defaults to type="button"', () => {
    render(<Button>Ok</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('applies fullWidth class', () => {
    render(<Button fullWidth>Full</Button>)
    expect(screen.getByRole('button')).toHaveClass('capi-btn--full')
  })
})
