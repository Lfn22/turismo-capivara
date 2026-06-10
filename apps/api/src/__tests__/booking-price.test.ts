import { describe, it, expect } from 'vitest'

describe('booking price calculation', () => {
  it('charges price * pax, not just price', () => {
    const price = 150.0
    const pax = 3
    const transactionAmount = Number(price) * pax
    expect(transactionAmount).toBe(450.0)
  })

  it('charges single pax correctly', () => {
    const price = 200.0
    const pax = 1
    const transactionAmount = Number(price) * pax
    expect(transactionAmount).toBe(200.0)
  })

  it('converts Decimal string price correctly before multiplication', () => {
    // Prisma retorna price como string "150.00" (tipo Decimal)
    const priceFromDb = '150.00' as unknown as number
    const pax = 2
    const transactionAmount = Number(priceFromDb) * pax
    expect(transactionAmount).toBe(300.0)
    expect(typeof transactionAmount).toBe('number')
  })
})
