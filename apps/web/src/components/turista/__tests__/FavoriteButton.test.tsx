import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FavoriteButton from '../FavoriteButton'

describe('FavoriteButton', () => {
  it('renderiza coração vazio quando não é favorito', () => {
    render(<FavoriteButton isFavorite={false} onToggle={() => {}} />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    expect(btn).toHaveAttribute('aria-label', 'Favoritar')
  })

  it('renderiza coração preenchido quando é favorito', () => {
    render(<FavoriteButton isFavorite={true} onToggle={() => {}} />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(btn).toHaveAttribute('aria-label', 'Remover dos favoritos')
  })

  it('chama onToggle ao clicar', () => {
    const onToggle = vi.fn()
    render(<FavoriteButton isFavorite={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledOnce()
  })
})
