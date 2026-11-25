import { describe, it, expect } from 'vitest'
import { parseSearchResponse, priceFilterParam } from './search-response'

describe('parseSearchResponse (GET /packages/search)', () => {
  it('lê o envelope paginado e converte priceFrom de reais para centavos', () => {
    const r = parseSearchResponse({
      data: [
        { id: 'p1', priceFrom: 180 },
        { id: 'p2', priceFrom: 99.9 },
      ],
      nextCursor: 'p2',
      hasMore: true,
    })
    expect(r.packages.map((p) => p.priceFrom)).toEqual([18000, 9990])
    expect(r.nextCursor).toBe('p2')
    expect(r.hasMore).toBe(true)
  })

  it('resposta inesperada → lista vazia sem quebrar', () => {
    expect(parseSearchResponse(null)).toEqual({ packages: [], nextCursor: null, hasMore: false })
  })
})

describe('priceFilterParam', () => {
  it('envia o filtro em reais, como a API compara', () => {
    expect(priceFilterParam('200')).toBe('200')
    expect(priceFilterParam('99,90')).toBe('99.9')
    expect(priceFilterParam('abc')).toBeUndefined()
  })
})
