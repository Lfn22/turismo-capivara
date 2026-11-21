'use client'

import { useRef, useCallback, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input, Chip, Button } from '@/src/components/ui/capi'

export interface Filters {
  q: string
  minPrice: string
  maxPrice: string
  difficulty: string[] // 'EASY' | 'MODERATE' | 'HARD'
}

interface FilterBarProps {
  filters: Filters
  onChange: (filters: Filters) => void
  showSearchArea: boolean
  onSearchArea: () => void
}

const DIFFICULTIES = [
  { value: 'EASY', label: 'Fácil' },
  { value: 'MODERATE', label: 'Moderado' },
  { value: 'HARD', label: 'Difícil' },
] as const

export default function FilterBar({
  filters,
  onChange,
  showSearchArea,
  onSearchArea,
}: FilterBarProps) {
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      searchTimerRef.current = setTimeout(() => {
        onChange({ ...filters, q: value })
      }, 500)
    },
    [filters, onChange],
  )

  const handlePriceChange = useCallback(
    (field: 'minPrice' | 'maxPrice', value: string) => {
      // Allow only digits
      const sanitized = value.replace(/\D/g, '')
      onChange({ ...filters, [field]: sanitized })
    },
    [filters, onChange],
  )

  const toggleDifficulty = useCallback(
    (diff: string) => {
      const current = filters.difficulty
      const next = current.includes(diff) ? current.filter((d) => d !== diff) : [...current, diff]
      onChange({ ...filters, difficulty: next })
    },
    [filters, onChange],
  )

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  return (
    <>
      <style>{filterBarStyles}</style>
      <div className="filter-bar">
        <div className="filter-bar__row">
          <div className="filter-bar__search">
            <Input
              label="Buscar roteiros"
              hideLabel
              type="search"
              defaultValue={filters.q}
              onChange={handleSearchChange}
              leadingIcon={Search}
              placeholder="Nome do roteiro ou guia"
              autoComplete="off"
            />
          </div>

          <div className="filter-bar__prices">
            <Input
              label="Preço mínimo"
              hideLabel
              type="text"
              inputMode="numeric"
              placeholder="R$ min"
              value={filters.minPrice}
              onChange={(e) => handlePriceChange('minPrice', e.target.value)}
              className="filter-bar__price-input"
            />
            <span className="filter-bar__sep" aria-hidden="true">
              –
            </span>
            <Input
              label="Preço máximo"
              hideLabel
              type="text"
              inputMode="numeric"
              placeholder="R$ max"
              value={filters.maxPrice}
              onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
              className="filter-bar__price-input"
            />
          </div>
        </div>

        <div className="filter-bar__row filter-bar__row--chips">
          <div className="filter-bar__chips" role="group" aria-label="Filtrar por dificuldade">
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d.value}
                selected={filters.difficulty.includes(d.value)}
                onClick={() => toggleDifficulty(d.value)}
              >
                {d.label}
              </Chip>
            ))}
          </div>

          {showSearchArea && (
            <Button size="sm" onClick={onSearchArea}>
              Buscar nesta área
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

const filterBarStyles = `
  .filter-bar {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3) 0;
  }
  .filter-bar__row {
    display: flex;
    align-items: flex-end;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .filter-bar__row--chips {
    align-items: center;
    justify-content: space-between;
  }
  .filter-bar__search {
    flex: 1;
    min-width: 180px;
  }
  .filter-bar__search .capi-field { margin: 0; }
  .filter-bar__prices {
    display: flex;
    align-items: flex-end;
    gap: var(--space-1);
  }
  .filter-bar__price-input { width: 90px; }
  .filter-bar__price-input .capi-field { margin: 0; }
  .filter-bar__sep {
    padding-bottom: 12px;
    color: var(--text-tertiary);
    font-size: 14px;
  }
  .filter-bar__chips {
    display: flex;
    gap: var(--space-2);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .filter-bar__chips::-webkit-scrollbar { display: none; }
  @media (max-width: 639px) {
    .filter-bar__prices { width: 100%; }
    .filter-bar__price-input { flex: 1; width: auto; }
  }
`
