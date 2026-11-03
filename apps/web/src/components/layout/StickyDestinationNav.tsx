'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/src/components/ui/capi';

export interface StickyDestinationNavProps {
  destinationName: string;
  destinationSlug: string;
  guidesHref?: string;    // deprecated — kept for backwards compatibility
  activeTab?: 'roteiros' | 'guias';
}

/**
 * Nav unificada da página de destino.
 *
 * Estados visuais (controlados por class toggle via refs — sem re-render):
 *   - Transparente: hero visível no viewport (texto e logo brancos sobre a foto)
 *   - Opaca:        hero fora do viewport (vidro claro, `.dest-nav--opaque` em globals.css)
 *   - Oculta:       rolando para baixo fora do hero (translates -100%)
 *
 * Lógica:
 *   1. IntersectionObserver no hero → detecta quando saiu do viewport
 *   2. scroll event → detecta direção (up/down) a partir do threshold de 6px
 *   3. Tudo via classList.add/remove → zero setState, zero re-render
 */
export default function StickyDestinationNav({
  destinationName,
  destinationSlug,
  activeTab,
}: StickyDestinationNavProps) {
  const navRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const heroVisible = useRef(true);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const setOpaque = (opaque: boolean) => {
      nav.classList.toggle('dest-nav--opaque', opaque);
      nav.classList.toggle('dest-nav--transparent', !opaque);
    };

    // ── 1. Observa o hero para alternar transparente ↔ opaco ──
    const hero = document.getElementById('hero');
    const observer = hero
      ? new IntersectionObserver(
          ([entry]) => {
            heroVisible.current = entry.isIntersecting;
            setOpaque(!entry.isIntersecting);
          },
          { threshold: 0.1 }
        )
      : null;

    if (hero && observer) observer.observe(hero);
    // Sem hero na página: a nav já começa sólida para manter o contraste.
    else {
      heroVisible.current = false;
      setOpaque(true);
    }

    // ── 2. Detecta direção de scroll para mostrar/ocultar ────
    const THRESHOLD = 6; // px mínimos para considerar mudança de direção

    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (Math.abs(delta) < THRESHOLD) return;

      if (delta > 0) {
        // Scroll down → hide nav
        if (!heroVisible.current) {
          nav.classList.add('dest-nav--hidden');
        }
      } else {
        // Scroll up → show nav
        nav.classList.remove('dest-nav--hidden');
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const tabs = [
    { key: 'roteiros', label: 'Roteiros', href: `/destinos/${destinationSlug}/roteiros` },
    { key: 'guias', label: 'Guias', href: `/destinos/${destinationSlug}/guias` },
  ] as const;

  return (
    <>
      <style>{`
        .snav__inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          height: 56px;
          max-width: var(--container-wide);
          margin: 0 auto;
          padding: 0 var(--gutter-mobile);
          font-family: var(--font-sans);
        }
        @media (min-width: 768px) { .snav__inner { height: var(--topbar-height); padding: 0 var(--gutter-tablet); } }
        @media (min-width: 1024px) { .snav__inner { padding: 0 var(--gutter-desktop); } }

        .snav__left { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }

        .snav__logo {
          display: inline-flex; align-items: center; flex-shrink: 0;
          min-height: var(--touch-target);
          border-radius: var(--radius-sm);
        }
        .snav__logo img { height: 36px; width: auto; display: block; transition: filter .2s ease; }
        .dest-nav--transparent .snav__logo img { filter: brightness(0) invert(1); }

        .snav__sep { width: 1px; height: 20px; flex-shrink: 0; background: var(--border-strong); }
        .dest-nav--transparent .snav__sep { background: var(--text-on-brand-secondary); opacity: .5; }

        .snav__back {
          display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
          min-height: var(--touch-target); padding: 0 var(--space-2);
          border-radius: var(--radius-pill);
          font-size: 14px; font-weight: 600; text-decoration: none;
          color: var(--text-secondary);
          transition: color .15s ease, background-color .15s ease;
        }
        .snav__back:hover { color: var(--text); background: var(--bg-subtle); }
        .dest-nav--transparent .snav__back { color: var(--text-on-brand); }
        .dest-nav--transparent .snav__back:hover { color: var(--text-on-brand); background: transparent; text-decoration: underline; }

        /* Nome do destino — aparece só quando opaco */
        .snav__name {
          font-family: var(--font-display);
          font-size: 17px; font-weight: 700;
          color: var(--text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 40vw;
          opacity: 0; transform: translateY(4px);
          transition: opacity .2s ease, transform .2s ease;
        }
        .snav__name-sep { display: none; }
        .dest-nav--opaque .snav__name { opacity: 1; transform: none; }
        .dest-nav--opaque .snav__name-sep { display: block; }

        /* Abas — só quando opaco e com espaço */
        .snav__tabs { display: none; align-items: stretch; height: 100%; }
        @media (min-width: 640px) { .dest-nav--opaque .snav__tabs { display: flex; } }
        .snav__tab {
          display: inline-flex; align-items: center;
          padding: 0 var(--space-4);
          font-size: 15px; font-weight: 500; text-decoration: none;
          color: var(--text-secondary);
          border-bottom: 2px solid transparent;
          transition: color .15s ease, border-color .15s ease;
        }
        .snav__tab:hover { color: var(--text); }
        .snav__tab[aria-current="page"] { color: var(--text); font-weight: 600; border-bottom-color: var(--brand); }

        @media (max-width: 380px) {
          .snav__cta { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .snav__name { transform: none; transition: none; }
        }
      `}</style>

      <nav
        ref={navRef}
        className="dest-nav dest-nav--transparent"
        aria-label="Navegação do destino"
      >
        <div className="snav__inner">
          <div className="snav__left">
            <Link href="/" className="snav__logo" aria-label="CAPI — página inicial">
              <Image src="/images/logo.png" alt="CAPI" width={40} height={36} />
            </Link>
            <span className="snav__sep" aria-hidden="true" />
            <Link href="/destinos" className="snav__back" aria-label="Voltar para destinos">
              <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
              Destinos
            </Link>
            <span className="snav__sep snav__name-sep" aria-hidden="true" />
            <span className="snav__name">{destinationName}</span>
          </div>

          <div className="snav__tabs">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                className="snav__tab"
                aria-current={activeTab === t.key ? 'page' : undefined}
              >
                {t.label}
              </Link>
            ))}
          </div>

          <Button
            href={`/destinos/${destinationSlug}/roteiros`}
            size="sm"
            iconRight={ArrowRight}
            className="snav__cta"
          >
            Ver roteiros
          </Button>
        </div>
      </nav>
    </>
  );
}
