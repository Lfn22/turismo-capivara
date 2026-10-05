export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ")
}

/** Centavos → "R$ 180" (sem centavos quando redondo) ou "R$ 250,50". */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

/** Minutos → "4h", "2h 30min", "45min". A API grava `duration` em horas: converta com `* 60` antes. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

/** 4.92 → "4,9" */
export function formatRating(value: number): string {
  return value.toFixed(1).replace(".", ",")
}
