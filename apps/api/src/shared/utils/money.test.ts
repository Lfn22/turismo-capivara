import { describe, it, expect } from 'vitest'
import { lineTotal, toCents, fromCents } from './money'

describe('money', () => {
  it('multiplica sem ruído de ponto flutuante', () => {
    expect(19.9 * 3).not.toBe(59.7) // o bug
    expect(lineTotal('19.90', 3)).toBe(59.7)
    expect(lineTotal(33.33, 3)).toBe(99.99)
  })

  it('somas em centavos são exatas', () => {
    const cents = [0.1, 0.2].map(toCents).reduce((a, b) => a + b, 0)
    expect(fromCents(cents)).toBe(0.3)
  })
})
