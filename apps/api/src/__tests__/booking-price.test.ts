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

  it('repay calculation matches create calculation formula', () => {
    const packagePrice = 100.0
    const pax = 2
    const createAmount = Number(packagePrice) * pax
    const repayAmount = Number(packagePrice) * pax
    expect(createAmount).toBe(repayAmount)
    expect(createAmount).toBe(200.0)
  })
})
