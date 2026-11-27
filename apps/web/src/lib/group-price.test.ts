import { describe, it, expect } from 'vitest'
import { GROUP_SIZE_PER_GUIDE, bookingValueReais, guidesFor, groupTotalCents } from './group-price'

describe('group-price', () => {
  it('grupo de 8 por guia', () => expect(GROUP_SIZE_PER_GUIDE).toBe(8))

  it('guidesFor arredonda para cima', () => {
    expect(guidesFor(1)).toBe(1)
    expect(guidesFor(8)).toBe(1)
    expect(guidesFor(9)).toBe(2)
    expect(guidesFor(16)).toBe(2)
    expect(guidesFor(17)).toBe(3)
  })

  it('total = valor do grupo + guia extra × (guias − 1)', () => {
    expect(groupTotalCents(60000, 40000, 8)).toBe(60000)
    expect(groupTotalCents(60000, 40000, 12)).toBe(100000)
    expect(groupTotalCents(60000, 40000, 17)).toBe(140000)
  })

  it('null quando precisa de guia extra e não há acréscimo', () => {
    expect(groupTotalCents(60000, null, 8)).toBe(60000)
    expect(groupTotalCents(60000, null, 9)).toBeNull()
  })

  it('bookingValueReais: valor gravado primeiro; legado sem amount cai em preço × pessoas', () => {
    const slot = { package: { price: '150' } }
    expect(bookingValueReais({ amount: '600.00', pax: 12, slot })).toBe(600)
    expect(bookingValueReais({ amount: 600, pax: 12, slot })).toBe(600)
    expect(bookingValueReais({ amount: null, pax: 3, slot })).toBe(450)
    expect(bookingValueReais({ pax: 3, slot })).toBe(450)
    expect(
      bookingValueReais({ amount: null, pax: 3, slot: { package: { price: 'x' } } }),
    ).toBeNull()
  })
})
