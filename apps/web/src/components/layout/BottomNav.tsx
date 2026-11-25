'use client'

import { Compass, House, LogIn, MapPin, User } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { BottomNav as CapiBottomNav, type NavItem } from '@/src/components/ui/capi'
import { accountHome } from '@/src/lib/account-links'

// Não existe rota global de reservas (/minha-reserva é por operadora),
// então o atalho de Destinos continua no lugar de "Reservas".
const BASE_ITEMS: NavItem[] = [
  { href: '/', label: 'Início', icon: House, exact: true },
  { href: '/destinos', label: 'Destinos', icon: MapPin },
  { href: '/explorar', label: 'Explorar', icon: Compass },
]

/** Navegação inferior das páginas públicas (só no celular, < 768px). */
export default function BottomNav() {
  const { data: session, status } = useSession()
  const user = status === 'authenticated' ? session?.user : undefined
  // Logado: a aba leva à área do perfil (viagens do turista ou painel); deslogado: "Entrar"
  const account: NavItem = user
    ? {
        href: accountHome(user.role as string | undefined, user.tenantSlug),
        label: 'Perfil',
        icon: User,
      }
    : { href: '/login', label: 'Entrar', icon: LogIn }
  return <CapiBottomNav items={[...BASE_ITEMS, account]} label="Navegação principal" />
}
