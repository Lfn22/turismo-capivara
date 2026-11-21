import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TuristaBottomNav from '../TuristaBottomNav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/minha-conta/viagens',
}))

describe('TuristaBottomNav', () => {
  it('renders 4 navigation links', () => {
    render(<TuristaBottomNav />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(4)
  })

  it('renders correct labels', () => {
    render(<TuristaBottomNav />)
    expect(screen.getByText('Viagens')).toBeInTheDocument()
    expect(screen.getByText('Favoritos')).toBeInTheDocument()
    expect(screen.getByText('Explorar')).toBeInTheDocument()
    expect(screen.getByText('Perfil')).toBeInTheDocument()
  })

  it('active item has aria-current="page"', () => {
    render(<TuristaBottomNav />)
    const viagens = screen.getByText('Viagens').closest('a')
    expect(viagens).toHaveAttribute('aria-current', 'page')
  })

  it('inactive items do not have aria-current', () => {
    render(<TuristaBottomNav />)
    const favoritos = screen.getByText('Favoritos').closest('a')
    const explorar = screen.getByText('Explorar').closest('a')
    const perfil = screen.getByText('Perfil').closest('a')
    expect(favoritos).not.toHaveAttribute('aria-current')
    expect(explorar).not.toHaveAttribute('aria-current')
    expect(perfil).not.toHaveAttribute('aria-current')
  })

  it('renders correct href values', () => {
    render(<TuristaBottomNav />)
    expect(screen.getByText('Viagens').closest('a')).toHaveAttribute('href', '/minha-conta/viagens')
    expect(screen.getByText('Favoritos').closest('a')).toHaveAttribute(
      'href',
      '/minha-conta/favoritos',
    )
    expect(screen.getByText('Explorar').closest('a')).toHaveAttribute('href', '/explorar')
    expect(screen.getByText('Perfil').closest('a')).toHaveAttribute('href', '/minha-conta/perfil')
  })
})
