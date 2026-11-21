import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MapInfoCard, { type MapInfoCardData } from './MapInfoCard'

// next/image renders a plain <img> in test env
// next/link renders a plain <a> in test env

function makeData(overrides: Partial<MapInfoCardData> = {}): MapInfoCardData {
  return {
    id: 'pkg-1',
    name: 'Trilha das Capivaras',
    href: '/roteiro/trilha-das-capivaras',
    ...overrides,
  }
}

describe('MapInfoCard', () => {
  it('renders name and subtitle', () => {
    render(<MapInfoCard data={makeData({ subtitle: 'Serra da Capivara' })} />)
    expect(screen.getByText('Trilha das Capivaras')).toBeInTheDocument()
    expect(screen.getByText('Serra da Capivara')).toBeInTheDocument()
  })

  it('renders price formatted as BRL', () => {
    render(<MapInfoCard data={makeData({ price: 250 })} />)
    const priceEl = screen.getByText(/R\$/)
    expect(priceEl).toHaveTextContent('250')
  })

  it('renders duration text', () => {
    render(<MapInfoCard data={makeData({ duration: '3h' })} />)
    expect(screen.getByText('3h')).toBeInTheDocument()
  })

  it('shows "Ver detalhes" link with correct href', () => {
    render(<MapInfoCard data={makeData()} />)
    const link = screen.getByRole('link', { name: 'Ver detalhes' })
    expect(link).toHaveAttribute('href', '/roteiro/trilha-das-capivaras')
  })

  it('calls onClose when close button clicked', () => {
    const handleClose = vi.fn()
    render(<MapInfoCard data={makeData()} onClose={handleClose} />)
    fireEvent.click(screen.getByLabelText('Fechar'))
    expect(handleClose).toHaveBeenCalledOnce()
  })

  it('hides close button when onClose is not provided', () => {
    render(<MapInfoCard data={makeData()} />)
    expect(screen.queryByLabelText('Fechar')).not.toBeInTheDocument()
  })

  it('hides image section when imageUrl is null', () => {
    const { container } = render(<MapInfoCard data={makeData({ imageUrl: null })} />)
    expect(container.querySelector('.map-info-card__img')).not.toBeInTheDocument()
  })

  it('shows image section when imageUrl is provided', () => {
    const { container } = render(<MapInfoCard data={makeData({ imageUrl: '/img.jpg' })} />)
    expect(container.querySelector('.map-info-card__img')).toBeInTheDocument()
  })
})
