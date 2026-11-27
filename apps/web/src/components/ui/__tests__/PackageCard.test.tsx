import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import PackageCard from '../PackageCard'

describe('PackageCard', () => {
  it('mostra o preço por grupo, não por pessoa', () => {
    const { container } = render(
      <PackageCard
        href="/x"
        package={{
          id: 'p1',
          name: 'Trilha',
          durationMinutes: 120,
          priceFrom: 150,
          difficulty: 'EASY',
          tags: [],
        }}
      />,
    )
    const price = container.querySelector('.capi-pkg__price')!.textContent!
    expect(price).toContain('grupo')
    expect(price).not.toContain('pessoa')
  })
})
