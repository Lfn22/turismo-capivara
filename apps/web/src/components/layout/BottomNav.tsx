'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4h4v4a1 1 0 001 1h3a1 1 0 001-1V10' },
  { href: '/destinos', label: 'Destinos', icon: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z' },
  { href: '/explorar', label: 'Explorar', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { href: '/login', label: 'Perfil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around md:hidden"
      style={{
        background: 'rgba(250,250,249,0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--stone-200)',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        paddingTop: '6px',
      }}>
      {NAV_ITEMS.map((item) => (
        <Link key={item.href} href={item.href}
          className="flex flex-col items-center gap-0.5 px-6 py-2 text-[10px] no-underline transition-colors"
          style={{ color: isActive(item.href) ? 'var(--ochre)' : 'var(--stone-500)' }}>
          <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor"
            strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
            <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
