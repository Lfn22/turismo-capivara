import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FilterBar, { type Filters } from './FilterBar'

const baseFilters: Filters = {
  q: '',
  minPrice: '',
  maxPrice: '',
  difficulty: [],
}

function renderFilterBar(
  overrides?: Partial<{
    filters: Filters
    onChange: (f: Filters) => void
    showSearchArea: boolean
    onSearchArea: () => void
  }>,
) {
  const props = {
    filters: overrides?.filters ?? baseFilters,
    onChange: overrides?.onChange ?? vi.fn(),
    showSearchArea: overrides?.showSearchArea ?? false,
    onSearchArea: overrides?.onSearchArea ?? vi.fn(),
  }
  return { ...render(<FilterBar {...props} />), props }
}

describe('FilterBar', () => {
  it('renderiza campo de busca', () => {
    renderFilterBar()
    expect(screen.getByPlaceholderText('Nome do roteiro ou guia')).toBeInTheDocument()
  })

  it('renderiza chips de dificuldade', () => {
    renderFilterBar()
    expect(screen.getByText('Fácil')).toBeInTheDocument()
    expect(screen.getByText('Moderado')).toBeInTheDocument()
    expect(screen.getByText('Difícil')).toBeInTheDocument()
  })

  it('chama onChange ao clicar em chip de dificuldade', () => {
    const onChange = vi.fn()
    renderFilterBar({ onChange })

    fireEvent.click(screen.getByText('Fácil'))

    expect(onChange).toHaveBeenCalledWith({
      ...baseFilters,
      difficulty: ['EASY'],
    })
  })

  it('remove dificuldade ao clicar novamente', () => {
    const onChange = vi.fn()
    renderFilterBar({
      onChange,
      filters: { ...baseFilters, difficulty: ['EASY'] },
    })

    fireEvent.click(screen.getByText('Fácil'))

    expect(onChange).toHaveBeenCalledWith({
      ...baseFilters,
      difficulty: [],
    })
  })

  it('renderiza campos de preço', () => {
    renderFilterBar()
    expect(screen.getByPlaceholderText('R$ min')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('R$ max')).toBeInTheDocument()
  })

  it('mostra botao "Buscar nesta area" quando showSearchArea=true', () => {
    renderFilterBar({ showSearchArea: true })
    expect(screen.getByText('Buscar nesta área')).toBeInTheDocument()
  })

  it('nao mostra botao "Buscar nesta area" quando showSearchArea=false', () => {
    renderFilterBar({ showSearchArea: false })
    expect(screen.queryByText('Buscar nesta área')).not.toBeInTheDocument()
  })

  it('chama onSearchArea ao clicar no botao de buscar area', () => {
    const onSearchArea = vi.fn()
    renderFilterBar({ showSearchArea: true, onSearchArea })

    fireEvent.click(screen.getByText('Buscar nesta área'))

    expect(onSearchArea).toHaveBeenCalledOnce()
  })

  it('chips tem aria-pressed correto', () => {
    renderFilterBar({
      filters: { ...baseFilters, difficulty: ['MODERATE'] },
    })

    expect(screen.getByText('Fácil')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Moderado')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Difícil')).toHaveAttribute('aria-pressed', 'false')
  })
})
