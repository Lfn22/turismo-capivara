import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

// ── Data layer ────────────────────────────────────────────────────────────────
// TODO (Task 11): replace stub with real fetch to GET /api/destinations

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

async function fetchDestinations(): Promise<DestinationSummary[]> {
  try {
    const res = await fetch(`${API_URL}/destinations`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) return res.json();
  } catch {
    // fallback to empty
  }
  return [];
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Destinos',
  description:
    'Explore destinos com guias certificados. Arte rupestre, patrimônio mundial e natureza preservada.',
};

// ── Blur placeholder ──────────────────────────────────────────────────────────

const FALLBACK_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiM0NDQwM2MiLz48L3N2Zz4=';

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DestinosPage() {
  const destinations = await fetchDestinations();

  return (
    <>
      <style>{`
        /* ── Layout ── */
        .destinos {
          min-height: 100dvh;
          background: var(--stone-50, #fafaf9);
        }

        /* ── Header ── */
        .destinos__header {
          background: var(--stone-900, #1c1917);
          color: #fff;
          padding: clamp(64px, 10vw, 96px) clamp(16px, 5vw, 64px) clamp(40px, 6vw, 56px);
        }

        .destinos__eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ochre, #c2783c);
          margin: 0 0 12px;
        }

        .destinos__title {
          font-family: var(--font-display, Georgia, serif);
          font-size: clamp(32px, 5vw, 52px);
          font-weight: 700;
          line-height: 1.1;
          margin: 0 0 12px;
          color: #fff;
        }

        .destinos__subtitle {
          font-size: 16px;
          color: var(--stone-400, #a8a29e);
          margin: 0;
          max-width: 480px;
        }

        /* ── Body ── */
        .destinos__body {
          max-width: 1280px;
          margin: 0 auto;
          padding: clamp(32px, 5vw, 56px) clamp(16px, 5vw, 64px);
        }

        /* ── Grid ── */
        .destinos__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }

        /* ── Card ── */
        .dcard {
          display: block;
          text-decoration: none;
          color: inherit;
          border-radius: 4px;
          overflow: hidden;
          background: #fff;
          border: 1px solid var(--stone-200, #e7e5e4);
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .dcard:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          transform: translateY(-2px);
        }
        .dcard:focus-visible {
          outline: 2px solid var(--ochre, #c2783c);
          outline-offset: 2px;
        }

        .dcard__image {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: var(--stone-800, #292524);
          overflow: hidden;
        }

        .dcard__image-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--stone-800, #292524), var(--stone-700, #44403c));
          color: var(--stone-600, #57534e);
        }

        .dcard__body {
          padding: 20px;
        }

        .dcard__state {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ochre, #c2783c);
          margin: 0 0 6px;
        }

        .dcard__name {
          font-family: var(--font-display, Georgia, serif);
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 8px;
          color: var(--stone-900, #1c1917);
          line-height: 1.2;
        }

        .dcard__desc {
          font-size: 14px;
          color: var(--stone-500, #78716c);
          margin: 0;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .dcard__arrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 14px;
          font-size: 13px;
          font-weight: 600;
          color: var(--ochre, #c2783c);
        }

        /* ── Empty state ── */
        .destinos__empty {
          text-align: center;
          padding: clamp(48px, 10vw, 96px) 16px;
          color: var(--stone-500, #78716c);
        }

        .destinos__empty-title {
          font-family: var(--font-display, Georgia, serif);
          font-size: clamp(22px, 4vw, 28px);
          color: var(--stone-700, #44403c);
          margin: 0 0 8px;
        }

        .destinos__empty-sub {
          font-size: 15px;
          margin: 0;
        }

        /* ── Mobile ── */
        @media (max-width: 480px) {
          .destinos__grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="destinos">
        {/* Header */}
        <header className="destinos__header">
          <p className="destinos__eyebrow">Destinos</p>
          <h1 className="destinos__title">Onde você quer explorar?</h1>
          <p className="destinos__subtitle">
            Destinos com guias certificados, roteiros únicos e experiências que
            só existem aqui.
          </p>
        </header>

        {/* Body */}
        <main className="destinos__body">
          {destinations.length > 0 ? (
            <div className="destinos__grid">
              {destinations.map((destination) => (
                <Link
                  key={destination.id}
                  href={`/destinos/${destination.slug}`}
                  className="dcard"
                >
                  {/* Image */}
                  <div className="dcard__image">
                    {destination.heroImageUrl ? (
                      <Image
                        src={destination.heroImageUrl}
                        alt={destination.title}
                        fill
                        sizes="(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        placeholder="blur"
                        blurDataURL={
                          destination.heroImageBlurDataUrl ?? FALLBACK_BLUR
                        }
                        style={{ objectFit: 'cover', objectPosition: 'center' }}
                      />
                    ) : (
                      <div className="dcard__image-placeholder" aria-hidden="true">
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="dcard__body">
                    <p className="dcard__state">{destination.state}</p>
                    <h2 className="dcard__name">{destination.title}</h2>
                    {destination.subtitle && (
                      <p className="dcard__desc">{destination.subtitle}</p>
                    )}
                    <span className="dcard__arrow">
                      Explorar destino
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="destinos__empty" role="status">
              <p className="destinos__empty-title">Destinos em breve</p>
              <p className="destinos__empty-sub">
                Novos destinos serão adicionados em breve.
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
