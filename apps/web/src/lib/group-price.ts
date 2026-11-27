export const GROUP_SIZE_PER_GUIDE = 8

/** guias necessários para `pax` pessoas (até 8 por guia). */
export function guidesFor(pax: number): number {
  return Math.ceil(pax / GROUP_SIZE_PER_GUIDE)
}

/** Total do grupo em centavos; null quando precisa de guia extra e o roteiro não tem acréscimo. */
export function groupTotalCents(
  groupPriceCents: number,
  extraGuidePriceCents: number | null,
  pax: number,
): number | null {
  const guides = guidesFor(pax)
  if (guides > 1 && extraGuidePriceCents == null) return null
  return groupPriceCents + (guides > 1 ? (extraGuidePriceCents as number) * (guides - 1) : 0)
}

/** Valor da reserva em reais: total gravado (Decimal pode chegar como string); legado sem amount: preço × pessoas. */
export function bookingValueReais(b: {
  amount?: number | string | null
  pax: number
  slot?: { package?: { price: number | string } }
}): number | null {
  const amount = b.amount == null ? NaN : Number(b.amount)
  if (Number.isFinite(amount)) return amount
  const price = Number(b.slot?.package?.price)
  return Number.isFinite(price) ? price * b.pax : null
}
