import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PricePill from './PricePill'

describe('PricePill', () => {
  it('renders formatted BRL price', () => {
    render(<PricePill price={150} />)
    expect(screen.getByRole('button')).toHaveTextContent('R$')
    expect(screen.getByRole('button')).toHaveTextContent('150')
  })

  it('applies selected class when selected=true', () => {
    render(<PricePill price={100} selected />)
    expect(screen.getByRole('button')).toHaveClass('map-price-pill--selected')
  })

  it('does not apply selected class when selected=false', () => {
    render(<PricePill price={100} />)
    expect(screen.getByRole('button')).not.toHaveClass('map-price-pill--selected')
  })

  it('applies hovered class when hovered=true', () => {
    render(<PricePill price={100} hovered />)
    expect(screen.getByRole('button')).toHaveClass('map-price-pill--hovered')
  })

  it('does not apply hovered class when hovered=false', () => {
    render(<PricePill price={100} />)
    expect(screen.getByRole('button')).not.toHaveClass('map-price-pill--hovered')
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<PricePill price={100} onClick={handleClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })
})
