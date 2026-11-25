import { isPlatformStaff } from '@/lib/roles'

export type AccountLink = { label: string; href: string }

function painelHref(
  role: string | undefined,
  tenantSlug: string | null | undefined,
): string | null {
  if (isPlatformStaff(role)) return '/super-admin/operadoras'
  if (!tenantSlug) return null
  if (role === 'ADMIN') return `/${tenantSlug}/admin/guias`
  return `/${tenantSlug}/painel/dashboard`
}

/**
 * Itens do menu da conta (avatar no cabeçalho), por perfil. Mesmo padrão dos
 * marketplaces de turismo: o viajante vê viagens e favoritos; quem opera vê o painel.
 * "Sair" e "Modo edição" ficam no próprio menu.
 */
export function accountLinks(
  role: string | undefined,
  tenantSlug: string | null | undefined,
): AccountLink[] {
  if (role === 'CLIENTE') {
    return [
      { label: 'Minhas viagens', href: '/minha-conta/viagens' },
      { label: 'Favoritos', href: '/minha-conta/favoritos' },
      { label: 'Minha conta', href: '/minha-conta/perfil' },
    ]
  }
  const links: AccountLink[] = []
  const painel = painelHref(role, tenantSlug)
  if (painel) links.push({ label: 'Meu painel', href: painel })
  if (role === 'ADMIN' || isPlatformStaff(role))
    links.push({ label: 'Pendências', href: '/pendencias' })
  links.push({ label: 'Minha conta', href: '/conta' })
  return links
}

/** Destino da aba "Perfil" da barra inferior do celular. */
export function accountHome(
  role: string | undefined,
  tenantSlug: string | null | undefined,
): string {
  if (!role) return '/login'
  if (role === 'CLIENTE') return '/minha-conta'
  return painelHref(role, tenantSlug) ?? '/conta'
}
