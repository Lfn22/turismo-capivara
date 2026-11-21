import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import StarRating from '../StarRating'

describe('StarRating', () => {
  it('renders 5 buttons', () => {
    render(<StarRating value={0} onChange={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(5)
  })

  it('calls onChange with correct value on click', () => {
    const onChange = vi.fn()
    render(<StarRating value={0} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('3 estrelas'))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('calls onChange with 1 when clicking the first star', () => {
    const onChange = vi.fn()
    render(<StarRating value={0} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('1 estrela'))
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('marks stars as pressed up to value', () => {
    render(<StarRating value={3} onChange={() => {}} />)
    expect(screen.getByLabelText('1 estrela')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('2 estrelas')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('3 estrelas')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('4 estrelas')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByLabelText('5 estrelas')).toHaveAttribute('aria-pressed', 'false')
  })

  it('disables all buttons when disabled=true', () => {
    render(<StarRating value={2} onChange={() => {}} disabled />)
    screen.getAllByRole('button').forEach((btn) => {
      expect(btn).toBeDisabled()
    })
  })
})
