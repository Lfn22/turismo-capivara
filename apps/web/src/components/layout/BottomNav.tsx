'use client';

import { Compass, House, MapPin, User } from 'lucide-react';
import { BottomNav as CapiBottomNav, type NavItem } from '@/src/components/ui/capi';

// Não existe rota global de reservas (/minha-reserva é por operadora),
// então o atalho de Destinos continua no lugar de "Reservas".
const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Início', icon: House, exact: true },
  { href: '/destinos', label: 'Destinos', icon: MapPin },
  { href: '/explorar', label: 'Explorar', icon: Compass },
  { href: '/login', label: 'Perfil', icon: User },
];

/** Navegação inferior das páginas públicas (só no celular, < 768px). */
export default function BottomNav() {
  return <CapiBottomNav items={NAV_ITEMS} label="Navegação principal" />;
}
