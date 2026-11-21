import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MiniPackageCard from './MiniPackageCard'

// next/image renders a plain <img> in test env
// next/link renders a plain <a> in test env

const baseProps = {
  id: 'pkg-1',
  name: 'Trilha das Capivaras',
  price: 150,
  href: '/serra/roteiros/pkg-1',
}

describe('MiniPackageCard', () => {
  it('renders name and formatted BRL price', () => {
    render(<MiniPackageCard {...baseProps} />)
    expect(screen.getByText('Trilha das Capivaras')).toBeInTheDocument()
    const priceEl = screen.getByText(/R\$/)
    expect(priceEl).toHaveTextContent('150')
  })

  it('renders duration when durationMinutes provided', () => {
    render(<MiniPackageCard {...baseProps} durationMinutes={90} />)
    expect(screen.getByText('1h 30min')).toBeInTheDocument()
  })

  it('renders difficulty label with correct text (EASY)', () => {
    render(<MiniPackageCard {...baseProps} difficulty="EASY" />)
    expect(screen.getByText('Fácil')).toBeInTheDocument()
  })

  it('renders difficulty label with correct text (MODERATE)', () => {
    render(<MiniPackageCard {...baseProps} difficulty="MODERATE" />)
    expect(screen.getByText('Moderado')).toBeInTheDocument()
  })

  it('renders difficulty label with correct text (HARD)', () => {
    render(<MiniPackageCard {...baseProps} difficulty="HARD" />)
    expect(screen.getByText('Difícil')).toBeInTheDocument()
  })

  it('shows "Ver roteiro" link with correct href', () => {
    render(<MiniPackageCard {...baseProps} />)
    const link = screen.getByRole('link', { name: 'Ver roteiro' })
    expect(link).toHaveAttribute('href', '/serra/roteiros/pkg-1')
  })

  it('hides image when coverPhotoUrl is null', () => {
    const { container } = render(<MiniPackageCard {...baseProps} coverPhotoUrl={null} />)
    expect(container.querySelector('.mini-pkg__img')).not.toBeInTheDocument()
  })

  it('shows image when coverPhotoUrl provided', () => {
    const { container } = render(
      <MiniPackageCard {...baseProps} coverPhotoUrl="https://img.test/photo.jpg" />,
    )
    expect(container.querySelector('.mini-pkg__img')).toBeInTheDocument()
  })
})
