/** Mesma regra da API: dígitos, espaços, ()+- e de 10 a 13 dígitos. Vazio = sem WhatsApp (null). */
export function normalizeWhatsapp(raw: string): { value: string | null; error: string | null } {
  const v = raw.trim()
  if (!v) return { value: null, error: null }
  const digits = v.replace(/\D/g, "").length
  if (!/^[\d\s()+-]+$/.test(v) || digits < 10 || digits > 13) {
    return { value: null, error: "WhatsApp inválido. Use DDD + número, ex.: (89) 99999-0000." }
  }
  return { value: v, error: null }
}
