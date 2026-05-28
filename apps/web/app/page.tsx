import type { Metadata } from 'next';
import Link from 'next/link';
import DestinationCard from '@/src/components/ui/DestinationCard';

// Force SSR — build container cannot reach the API at build time
export const dynamic = 'force-dynamic';

// ── Data layer ────────────────────────────────────────────────────────────────

const API_URL = process.env.API_URL ?? 'http://localhost:3333';

interface DestinationSummary {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  state: string;
  heroImageUrl: string | null;
  heroImageBlurDataUrl: string | null;
}

async function fetchDestinations(): Promise<DestinationSummary[] | null> {
  try {
    const res = await fetch(`${API_URL}/destinations`, { cache: 'no-store' });
    if (res.ok) return res.json();
    return null; // API respondeu com erro (4xx/5xx)
  } catch {
    return null; // rede inacessível
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'CAPI — caminho entre quem explora e quem opera',
  description:
    'Encontre guias certificados, compare roteiros e reserve com PIX. O marketplace de turismo que conecta viajantes e condutores locais.',
  openGraph: {
    title: 'CAPI',
    description: 'caminho entre quem explora e quem opera',
    locale: 'pt_BR',
  },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const destinations = await fetchDestinations();
  const firstSlug = destinations?.[0]?.slug ?? null;
  const guiasHref = firstSlug ? `/destinos/${firstSlug}/guias` : '/destinos';
  const previewDestinations = destinations?.slice(0, 3) ?? [];

  return (
    <>
      <style>{`
        /* ── Reset ── */
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Nav ── */
        .home-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: var(--stone-900, #1c1917);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding: 0 clamp(16px, 5vw, 48px);
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .home-nav__wordmark {
          font-family: var(--font-display, Georgia, serif);
          font-size: 22px;
          font-weight: 700;
          color: var(--ochre, #c8961c);
          letter-spacing: -0.02em;
          text-decoration: none;
        }
        .home-nav__links {
          display: flex;
          align-items: center;
          gap: clamp(16px, 3vw, 32px);
        }
        .home-nav__link {
          font-size: 13px;
          font-weight: 500;
          color: var(--stone-400, #a8a29e);
          text-decoration: none;
          transition: color 0.15s;
        }
        .home-nav__link:hover { color: #fff; }
        .home-nav__cta {
          font-size: 13px;
          font-weight: 600;
          color: var(--stone-900, #1c1917);
          background: var(--ochre, #c8961c);
          padding: 8px 18px;
          border-radius: 2px;
          text-decoration: none;
          transition: opacity 0.15s;
        }
        .home-nav__cta:hover { opacity: 0.88; }

        /* ── Hero (Section 1 — 50dvh) ── */
        .home-hero {
          height: 50dvh;
          min-height: 360px;
          margin-top: 56px;
          background: var(--stone-900, #1c1917);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: clamp(24px, 5vw, 56px) clamp(16px, 7vw, 80px);
          position: relative;
          overflow: hidden;
        }
        .home-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 70% 60% at 60% 40%, rgba(200,150,28,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .home-hero__inner {
          max-width: 900px;
          position: relative;
        }
        .home-hero__eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ochre, #c8961c);
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .home-hero__eyebrow::before {
          content: '';
          display: block;
          width: 28px;
          height: 1px;
          background: var(--ochre, #c8961c);
          flex-shrink: 0;
        }
        .home-hero__wordmark {
          font-family: var(--font-display, Georgia, serif);
          font-size: clamp(4rem, 11vw, 9rem);
          font-weight: 700;
          line-height: 0.9;
          letter-spacing: -0.04em;
          color: #fff;
          margin-bottom: clamp(0.5rem, 1.5vw, 1.25rem);
        }
        .home-hero__tagline {
          font-size: clamp(0.875rem, 1.6vw, 1.15rem);
          color: var(--stone-400, #a8a29e);
          line-height: 1.5;
          max-width: 480px;
          margin-bottom: clamp(1.25rem, 2.5vw, 2rem);
        }
        .home-hero__actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .home-hero__btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: var(--stone-900, #1c1917);
          background: var(--ochre, #c8961c);
          padding: 11px 22px;
          border-radius: 2px;
          text-decoration: none;
          transition: opacity 0.15s;
        }
        .home-hero__btn:hover { opacity: 0.88; }
        .home-hero__btn--ghost {
          color: var(--stone-300, #d6d3d1);
          background: transparent;
          border: 1px solid rgba(255,255,255,0.15);
        }
        .home-hero__btn--ghost:hover {
          opacity: 1;
          border-color: rgba(255,255,255,0.3);
          color: #fff;
        }

        /* ── Catalog (Section 2 — 50dvh) ── */
        .home-catalog {
          height: 50dvh;
          min-height: 360px;
          background: var(--stone-50, #fafaf9);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: clamp(20px, 3.5vw, 40px) clamp(16px, 5vw, 48px);
        }
        .home-catalog__header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: clamp(14px, 2vw, 22px);
          flex-shrink: 0;
          max-width: 1280px;
          width: 100%;
          align-self: center;
        }
        .home-catalog__eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ochre, #c8961c);
          margin-bottom: 4px;
        }
        .home-catalog__title {
          font-family: var(--font-display, Georgia, serif);
          font-size: clamp(20px, 2.8vw, 32px);
          font-weight: 700;
          color: var(--stone-900, #1c1917);
          line-height: 1.15;
          letter-spacing: -0.02em;
        }
        .home-catalog__link {
          font-size: 13px;
          font-weight: 600;
          color: var(--ochre, #c8961c);
          text-decoration: none;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
        }
        .home-catalog__link:hover { opacity: 0.75; }
        .home-catalog__grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          flex: 1;
          min-height: 0;
          overflow: hidden;
          max-width: 1280px;
          width: 100%;
          align-self: center;
        }
        .home-catalog__grid .dcard {
          height: 100%;
          overflow: hidden;
        }
        .home-catalog__empty {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
          color: var(--stone-500, #78716c);
          font-size: 15px;
        }

        /* ── Footer ── */
        .home-footer {
          background: var(--stone-900, #1c1917);
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: clamp(40px, 6vw, 64px) clamp(16px, 5vw, 48px);
        }
        .home-footer__inner {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 24px;
        }
        .home-footer__brand { flex: 1; }
        .home-footer__wordmark {
          font-family: var(--font-display, Georgia, serif);
          font-size: 18px;
          font-weight: 700;
          color: var(--ochre, #c8961c);
          letter-spacing: -0.02em;
          margin-bottom: 4px;
        }
        .home-footer__tagline {
          font-size: 12px;
          color: var(--stone-500, #78716c);
          letter-spacing: 0.03em;
        }
        .home-footer__panel-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--stone-300, #d6d3d1);
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          padding: 10px 20px;
          border-radius: 2px;
          text-decoration: none;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .home-footer__panel-btn:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.22);
          color: #fff;
        }
        .home-footer__copy {
          font-size: 12px;
          color: var(--stone-600, #57534e);
          width: 100%;
        }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .home-catalog__grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .home-nav__links { display: none; }
          .home-hero, .home-catalog {
            height: auto;
            min-height: 50dvh;
          }
          .home-catalog__grid { grid-template-columns: 1fr; }
          .home-catalog__header { flex-direction: column; gap: 8px; }
          .home-footer__inner { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      {/* Nav */}
      <nav className="home-nav">
        <Link href="/" className="home-nav__wordmark">CAPI</Link>
        <div className="home-nav__links">
          <Link href="/destinos" className="home-nav__link">Destinos</Link>
          <Link href={guiasHref} className="home-nav__link">Guias</Link>
          <Link href="/destinos" className="home-nav__cta">Explorar</Link>
        </div>
      </nav>

      {/* Section 1 — Hero */}
      <section className="home-hero">
        <div className="home-hero__inner">
          <p className="home-hero__eyebrow">Marketplace de turismo</p>
          <h1 className="home-hero__wordmark">CAPI</h1>
          <p className="home-hero__tagline">
            caminho entre quem explora e quem opera
          </p>
          <div className="home-hero__actions">
            <Link href="/destinos" className="home-hero__btn">
              Explorar destinos
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href={guiasHref} className="home-hero__btn home-hero__btn--ghost">
              Ver guias
            </Link>
          </div>
        </div>
      </section>

      {/* Section 2 — Destinations catalog */}
      <section className="home-catalog">
        <div className="home-catalog__header">
          <div>
            <p className="home-catalog__eyebrow">Destinos</p>
            <h2 className="home-catalog__title">Onde você quer explorar?</h2>
          </div>
          <Link href="/destinos" className="home-catalog__link">
            Ver todos
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {destinations === null ? (
          <div className="home-catalog__empty" role="status">
            Não foi possível carregar os destinos. Tente novamente em instantes.
          </div>
        ) : previewDestinations.length > 0 ? (
          <div className="home-catalog__grid">
            {previewDestinations.map((destination) => (
              <DestinationCard
                key={destination.id}
                slug={destination.slug}
                title={destination.title}
                subtitle={destination.subtitle}
                state={destination.state}
                heroImageUrl={destination.heroImageUrl}
                heroImageBlurDataUrl={destination.heroImageBlurDataUrl}
                headingLevel="h3"
              />
            ))}
          </div>
        ) : (
          <div className="home-catalog__empty" role="status">
            Nenhum destino cadastrado ainda.
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="home-footer__inner">
          <div className="home-footer__brand">
            <p className="home-footer__wordmark">CAPI</p>
            <p className="home-footer__tagline">caminho entre quem explora e quem opera</p>
          </div>
          <Link href="/onboarding" className="home-footer__panel-btn">
            Acessar painel
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </Link>
          <p className="home-footer__copy">© {new Date().getFullYear()} CAPI</p>
        </div>
      </footer>
    </>
  );
}
