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

export const GROUP_SIZE_PER_GUIDE = 8

/** guias necessários para `pax` pessoas (até 8 por guia). */
export function guidesFor(pax: number): number {
  return Math.ceil(pax / GROUP_SIZE_PER_GUIDE)
}

/**
 * Total do grupo em reais com 2 casas exatas: `groupPrice` (1 guia, até 8 pessoas)
 * + `extraGuidePrice` × (guias − 1). Sem `extraGuidePrice`, só cabe 1 guia.
 */
export function groupTotal(
  groupPrice: unknown,
  extraGuidePrice: unknown | null,
  pax: number,
): number {
  const guides = guidesFor(pax)
  if (guides > 1 && extraGuidePrice == null) throw new Error('GROUP_TOO_LARGE')
  const extra = guides > 1 ? toCents(extraGuidePrice) * (guides - 1) : 0
  return fromCents(toCents(groupPrice) + extra)
}

/** Receita da reserva em centavos: valor gravado; legada (sem amount) cai em preço × pax. */
export function bookingRevenueCents(b: {
  amount: unknown | null
  pax: number
  slot: { package: { price: unknown } }
}): number {
  return b.amount != null ? toCents(b.amount) : toCents(b.slot.package.price) * b.pax
}
