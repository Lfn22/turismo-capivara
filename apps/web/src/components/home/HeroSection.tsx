import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Search } from 'lucide-react';
import { Button, Input, TopNav } from '@/src/components/ui/capi';
import CapiLogoAnimated from './CapiLogoAnimated';
import DustParticles from './DustParticles';
import HeroSlideshow, { type HeroSlide } from './HeroSlideshow';
import '@/src/styles/rupestre.css';

interface QuickLink {
  href: string;
  label: string;
}

interface Props {
  /** Fotos de destinos e roteiros que passam no fundo do hero. Sem fotos, usa `surface-brand`. */
  slides?: HeroSlide[];
  /** Atalhos em chips logo abaixo da busca. */
  quickLinks?: QuickLink[];
}

const NAV_LINKS = [
  { href: '/destinos', label: 'Destinos' },
  { href: '/explorar', label: 'Explorar' },
];

export default function HeroSection({ slides = [], quickLinks = [] }: Props) {
  return (
    <>
      <style>{`
        .home-hero {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          background: var(--surface-brand);
          color: var(--text-on-brand);
        }
        .home-hero__scrim {
          position: absolute; inset: 0; z-index: -1; pointer-events: none;
          background: linear-gradient(to top, var(--scrim-photo) 0%, var(--scrim-photo) 35%, transparent 100%),
                      linear-gradient(to bottom, var(--scrim-photo), transparent 40%);
        }
        .home-hero__texture { z-index: -1; opacity: .15; }
        .home-hero__content {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding-top: calc(56px + var(--space-10));
          padding-bottom: calc(var(--space-16) + var(--space-8) + var(--touch-target));
        }
        @media (min-width: 768px) {
          .home-hero__content {
            padding-top: calc(var(--topbar-height) + var(--space-16));
            padding-bottom: calc(var(--space-24) + var(--space-8) + var(--touch-target));
          }
        }
        .home-hero__logo { width: clamp(140px, 28vw, 220px); filter: brightness(0) invert(1); }
        .home-hero__title {
          margin-top: var(--space-6);
          max-width: 18ch;
          font-family: var(--font-display);
          font-size: clamp(34px, 6vw, 56px);
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.015em;
          color: var(--text-on-brand);
        }
        .home-hero__lead {
          margin-top: var(--space-4);
          max-width: 34rem;
          font-size: clamp(16px, 2.2vw, 18px);
          line-height: 1.55;
          color: var(--text-on-brand);
          opacity: .9;
        }
        .home-hero__navlogo img { height: 36px; width: auto; display: block; filter: brightness(0) invert(1); }

        .home-search {
          position: relative; z-index: 2;
          margin-top: calc(var(--space-16) * -1);
        }
        .home-search__card {
          display: flex; flex-direction: column; gap: var(--space-3);
          padding: var(--space-4);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          max-width: 760px;
          margin-inline: auto;
        }
        .home-search__card .capi-field { flex: 1; }
        @media (min-width: 640px) {
          .home-search__card { flex-direction: row; align-items: flex-end; padding: var(--space-5); }
        }
        .home-search__chips {
          display: flex; gap: var(--space-2);
          overflow-x: auto; scrollbar-width: none;
          margin: var(--space-4) calc(var(--gutter-mobile) * -1) 0;
          padding: 2px var(--gutter-mobile);
        }
        .home-search__chips::-webkit-scrollbar { display: none; }
        @media (min-width: 640px) {
          .home-search__chips { justify-content: center; flex-wrap: wrap; overflow: visible; margin-inline: 0; padding-inline: 0; }
        }
        .home-search__chip { min-height: var(--touch-target); text-decoration: none; }
      `}</style>

      <section className="home-hero" aria-labelledby="home-hero-title">
        {slides.length > 0 ? (
          <HeroSlideshow slides={slides} />
        ) : (
          <div className="stone-texture home-hero__texture absolute inset-0" aria-hidden="true" />
        )}
        <div className="home-hero__scrim" aria-hidden="true" />
        <DustParticles />

        <TopNav
          variant="transparent"
          links={NAV_LINKS}
          logo={
            <Link
              href="/"
              aria-label="CAPI — página inicial"
              className="home-hero__navlogo inline-flex items-center"
              style={{ minHeight: 'var(--touch-target)' }}
            >
              <Image src="/images/logo.png" alt="CAPI" width={40} height={36} priority />
            </Link>
          }
          actions={
            <Button href="/login" variant="secondary" size="sm">
              Entrar
            </Button>
          }
        />

        <div className="capi-container home-hero__content">
          <div className="home-hero__logo" aria-hidden="true">
            <CapiLogoAnimated maxWidth="100%" />
          </div>
          <h1 id="home-hero-title" className="home-hero__title">
            Explore com quem conhece o caminho
          </h1>
          <p className="home-hero__lead">
            Encontre guias certificados, compare roteiros e reserve com PIX.
          </p>
        </div>
      </section>

      <div className="capi-container home-search">
        <form action="/explorar" method="get" role="search" className="home-search__card">
          <Input
            label="Buscar guias"
            hideLabel
            name="q"
            type="search"
            leadingIcon={Search}
            placeholder="Busque por guia ou especialidade"
            autoComplete="off"
          />
          <Button type="submit" size="lg">
            Buscar
          </Button>
        </form>

        {quickLinks.length > 0 ? (
          <nav className="home-search__chips" aria-label="Destinos em destaque">
            {quickLinks.map((l) => (
              <Link key={l.href} href={l.href} className="capi-chip home-search__chip">
                <MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
                {l.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </>
  );
}
