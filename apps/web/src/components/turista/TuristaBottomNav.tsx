'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart, MapPin, Search, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/minha-conta/viagens', label: 'Viagens', icon: MapPin },
  { href: '/minha-conta/favoritos', label: 'Favoritos', icon: Heart },
  { href: '/explorar', label: 'Explorar', icon: Search, exact: true },
  { href: '/minha-conta/perfil', label: 'Perfil', icon: User },
]

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(item.href + '/')
}

export default function TuristaBottomNav() {
  const pathname = usePathname() ?? '/'

  return (
    <>
      <style>{`
        .turista-bnav {
          position: fixed;
          left: 0; right: 0; bottom: 0;
          z-index: var(--z-nav);
          display: flex;
          background: var(--glass);
          -webkit-backdrop-filter: saturate(1.6) blur(16px);
          backdrop-filter: saturate(1.6) blur(16px);
          border-top: 1px solid var(--border);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        .turista-bnav__item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          min-height: 52px;
          padding-top: var(--space-2);
          text-decoration: none;
          color: var(--text-secondary);
          -webkit-tap-highlight-color: transparent;
        }
        .turista-bnav__pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 30px;
          border-radius: var(--radius-pill);
          transition: background-color .2s ease;
        }
        .turista-bnav__label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .02em;
        }
        .turista-bnav__item.is-active { color: var(--text); }
        .turista-bnav__item.is-active .turista-bnav__pill {
          background: var(--primary-subtle);
          color: var(--text-primary);
        }
        .turista-bnav__item:focus-visible { outline: none; }
        .turista-bnav__item:focus-visible .turista-bnav__pill {
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
        }
        @media (min-width: 1024px) {
          .turista-bnav {
            position: static;
            flex-direction: column;
            gap: var(--space-1);
            background: transparent;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            border-top: none;
            padding-bottom: 0;
          }
          .turista-bnav__item {
            flex-direction: row;
            justify-content: flex-start;
            gap: var(--space-3);
            min-height: 44px;
            padding: var(--space-2) var(--space-3);
            border-radius: var(--radius-md);
          }
          .turista-bnav__pill {
            width: 32px;
            height: 32px;
            border-radius: var(--radius-sm);
          }
          .turista-bnav__label {
            font-size: var(--text-sm);
          }
        }
      `}</style>
      <nav className="turista-bnav" aria-label="Navegação do turista">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`turista-bnav__item${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="turista-bnav__pill">
                <Icon size={22} strokeWidth={active ? 2 : 1.75} aria-hidden="true" />
              </span>
              <span className="turista-bnav__label">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
