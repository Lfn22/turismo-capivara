/**
 * Formata um valor em centavos para moeda.
 * @param cents - valor em centavos (ex: 150000 = R$ 1.500,00)
 * @param currency - código ISO da moeda (ex: 'BRL')
 */
export function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

/**
 * Formata uma data em português por extenso.
 * @param date - objeto Date
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/**
 * Formata um número de telefone brasileiro.
 * Aceita 10 dígitos (fixo) ou 11 dígitos (celular).
 * @param raw - string com dígitos (outros chars ignorados)
 */
export function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  // Remove DDI Brasil (55) se presente antes de DDD+número
  if (digits.length === 13 && digits.startsWith('55')) digits = digits.slice(2)
  if (digits.length === 12 && digits.startsWith('55')) digits = digits.slice(2)
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return raw
}
