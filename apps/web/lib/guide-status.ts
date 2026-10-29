// Guia ainda não verificado vai para a tela de status; falha na consulta segue a regra normal de login.
export async function isGuideUnverified(): Promise<boolean> {
  try {
    const res = await fetch("/api/proxy?path=/guides/me")
    if (!res.ok) return false
    const data = await res.json()
    return data.approvalStatus !== "APPROVED"
  } catch {
    return false
  }
}
