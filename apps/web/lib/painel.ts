/** Rótulo do painel conforme o papel: ADMIN administra a agência; CONDUTOR é o guia. */
export function painelEyebrow(role?: string | null): string {
  return role === "ADMIN" ? "Painel da agência" : "Painel do guia"
}
