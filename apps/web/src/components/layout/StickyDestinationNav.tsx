'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

export interface StickyDestinationNavProps {
  destinationName: string;
  destinationSlug: string;
  guidesHref?: string;
}

/**
 * Nav unificada da página de destino.
 *
 * Estados visuais (controlados por class toggle via refs — sem re-render):
 *   - Transparente: hero visível no viewport
 *   - Opaca:        hero fora do viewport (scroll down)
 *   - Oculta:       scroll up ativo (translates -100%)
 *
 * Lógica:
 *   1. IntersectionObserver no hero → detecta quando saiu do viewport
 *   2. scroll event → detecta direção (up/down) a partir do threshold de 6px
 *   3. Tudo via classList.add/remove → zero setState, zero re-render
 */
export default function StickyDestinationNav({
  destinationName,
  destinationSlug,
  guidesHref,
}: StickyDestinationNavProps) {
  const resolvedGuidesHref = guidesHref ?? `/destinos/${destinationSlug}/guias`;
  const navRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const heroVisible = useRef(true);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    // ── 1. Observa o hero para alternar transparente ↔ opaco ──
    const hero = document.getElementById('hero');
    const observer = hero
      ? new IntersectionObserver(
          ([entry]) => {
            heroVisible.current = entry.isIntersecting;
            if (entry.isIntersecting) {
              nav.classList.remove('snav--opaque');
            } else {
              nav.classList.add('snav--opaque');
            }
          },
          { threshold: 0.1 }
        )
      : null;

    if (hero && observer) observer.observe(hero);

    // ── 2. Detecta direção de scroll para mostrar/ocultar ────
    const THRESHOLD = 6; // px mínimos para considerar mudança de direção

    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (Math.abs(delta) < THRESHOLD) return;

      if (delta > 0) {
        // Scroll down → mostra nav (se hero já saiu do viewport)
        if (!heroVisible.current) {
          nav.classList.remove('snav--hidden');
        }
      } else {
        // Scroll up → esconde nav
        nav.classList.add('snav--hidden');
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <>
      <style>{`
        .snav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 clamp(1.5rem, 5vw, 3.5rem);
          height: 56px;
          background: transparent;
          transition:
            background-color 0.3s ease,
            transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
            backdrop-filter 0.3s ease;
          will-change: transform;
        }

        /* Opaco: hero fora do viewport */
        .snav--opaque {
          background-color: var(--stone-900);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        /* Oculto: scroll up */
        .snav--hidden {
          transform: translateY(-100%);
        }

        /* Grupo esquerdo */
        .snav__left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .snav__back {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
          transition: color 0.2s;
          padding: 0.5rem 0;
        }

        .snav__back:hover { color: var(--stone-50); }

        /* Separador vertical */
        .snav__sep {
          width: 1px;
          height: 16px;
          background: rgba(255, 255, 255, 0.18);
        }

        /* Nome do destino — aparece só quando opaco */
        .snav__name {
          font-family: var(--font-display), Georgia, serif;
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: -0.01em;
          opacity: 0;
          transform: translateY(4px);
          transition: opacity 0.25s ease, transform 0.25s ease;
          pointer-events: none;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
        }

        .snav--opaque .snav__name {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        /* CTA direito */
        .snav__cta {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--stone-900);
          background: var(--ochre);
          text-decoration: none;
          padding: 0.5rem 1.1rem;
          border-radius: 2px;
          transition: background 0.2s, transform 0.15s;
          white-space: nowrap;
        }

        .snav__cta:hover {
          background: var(--ochre-dark);
          transform: translateY(-1px);
        }

        /* Mobile: esconde o CTA em telas muito pequenas */
        @media (max-width: 360px) {
          .snav__cta { display: none; }
          .snav__name { max-width: 140px; }
        }
      `}</style>

      <nav ref={navRef} className="snav" aria-label="Navegação do destino">
        <div className="snav__left">
          <Link href="/destinos" className="snav__back" aria-label="Voltar para destinos">
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Destinos
          </Link>
          <div className="snav__sep" aria-hidden="true" />
          <span className="snav__name">{destinationName}</span>
        </div>

        <a href={resolvedGuidesHref} className="snav__cta" aria-label="Ver guias disponíveis">
          Ver guias
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </nav>
    </>
  );
}
