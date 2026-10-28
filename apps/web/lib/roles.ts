// Equipe da plataforma: SUPER_ADMIN e PLATFORM_ADMIN (mesma regra da API)
export function isPlatformStaff(role?: string): boolean {
  return role === "SUPER_ADMIN" || role === "PLATFORM_ADMIN"
}

// Aceita só caminhos do próprio site. Rejeita "//host", "\", caracteres de controle
// (o navegador remove TAB/LF e trata "\" como "/") e qualquer URL que resolva para outra origem.
export function safeCallbackUrl(raw: string | null, origin: string): string | null {
  if (!raw || /[\\\x00-\x1f\x7f]/.test(raw) || !raw.startsWith("/") || raw.startsWith("//")) {
    return null
  }
  try {
    const u = new URL(raw, origin)
    if (u.origin !== new URL(origin).origin) return null
    // A normalização de "." / ".." pode gerar "//host" no resultado — validar de novo
    const result = u.pathname + u.search + u.hash
    if (!result.startsWith("/") || result.startsWith("//") || result.includes("\\")) return null
    return result
  } catch {
    return null
  }
}
