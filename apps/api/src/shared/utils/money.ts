/**
 * Dinheiro em centavos inteiros (aritmética exata). `Number(price) * pax` em float
 * gerava ruído (19.9 * 3 = 59.699999999999996) no valor enviado ao Mercado Pago e
 * acumulava erro nas somas dos relatórios.
 */
export function toCents(value: unknown): number {
  return Math.round(Number(value) * 100)
}

export function fromCents(cents: number): number {
  return cents / 100
}

/** preço unitário (Decimal/string/number) × quantidade, em reais com 2 casas exatas. */
export function lineTotal(unitPrice: unknown, quantity: number): number {
  return fromCents(toCents(unitPrice) * quantity)
}
