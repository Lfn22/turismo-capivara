import { describe, it, expect } from 'vitest'
import { lineTotal, toCents, fromCents, groupTotal, guidesFor, bookingRevenueCents } from './money'

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

describe('groupTotal', () => {
  it('cobra o valor do grupo para 1 a 8 pessoas', () => {
    expect(groupTotal('600.00', '400.00', 1)).toBe(600)
    expect(groupTotal('600.00', '400.00', 8)).toBe(600)
  })
  it('soma um acréscimo por guia extra', () => {
    expect(groupTotal('600.00', '400.00', 9)).toBe(1000)
    expect(groupTotal('600.00', '400.00', 16)).toBe(1000)
    expect(groupTotal('600.00', '400.00', 17)).toBe(1400)
  })
  it('sem acréscimo definido, grupo acima de 8 é recusado', () => {
    expect(() => groupTotal('600.00', null, 9)).toThrow('GROUP_TOO_LARGE')
    expect(groupTotal('600.00', null, 8)).toBe(600)
  })
  it('é exato em centavos', () => {
    expect(groupTotal('199.90', '0.10', 9)).toBe(200)
  })
})

describe('guidesFor', () => {
  it.each([
    [1, 1],
    [8, 1],
    [9, 2],
    [16, 2],
    [17, 3],
  ])('%i pessoas → %i guias', (pax, g) => expect(guidesFor(pax)).toBe(g))
})

describe('bookingRevenueCents', () => {
  it('usa o valor gravado na reserva', () => {
    expect(
      bookingRevenueCents({ amount: '1000.00', pax: 9, slot: { package: { price: '600' } } }),
    ).toBe(100000)
  })
  it('reserva legada (sem amount) cai no preço × pax', () => {
    expect(bookingRevenueCents({ amount: null, pax: 3, slot: { package: { price: '150' } } })).toBe(
      45000,
    )
  })
})
