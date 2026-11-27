import { describe, it, expect } from 'vitest'
import { groupTotal } from '../shared/utils/money'

describe('booking price calculation (preço por grupo)', () => {
  it('família de 4 paga o valor do grupo, não price * pax', () => {
    expect(groupTotal('600.00', '400.00', 4)).toBe(600)
  })

  it('1 pessoa paga o valor do grupo', () => {
    expect(groupTotal('600.00', '400.00', 1)).toBe(600)
  })

  it('12 pessoas pagam o grupo + 1 acréscimo de guia extra', () => {
    expect(groupTotal('600.00', '400.00', 12)).toBe(1000)
  })

  it('aceita Decimal vindo do Prisma como string e devolve number', () => {
    const total = groupTotal('150.00', null, 2)
    expect(total).toBe(150)
    expect(typeof total).toBe('number')
  })
})
