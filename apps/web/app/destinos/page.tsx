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
  title: 'Destinos',
  description:
    'Explore destinos com guias certificados. Arte rupestre, patrimônio mundial e natureza preservada.',
};

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
          <Link href="/" style={{ display: 'inline-block', color: 'var(--ochre)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.06em', textDecoration: 'none', marginBottom: '1rem' }}>CAPI</Link>
          <p className="destinos__eyebrow">Destinos</p>
          <h1 className="destinos__title">Onde você quer explorar?</h1>
          <p className="destinos__subtitle">
            Destinos com guias certificados, roteiros únicos e experiências que
            só existem aqui.
          </p>
        </header>

        {/* Body */}
        <main className="destinos__body">
          {destinations === null ? (
            <div className="destinos__empty" role="status">
              <p className="destinos__empty-title">Erro ao carregar destinos</p>
              <p className="destinos__empty-sub">
                Não foi possível conectar ao servidor. Tente novamente em instantes.
              </p>
            </div>
          ) : destinations.length > 0 ? (
            <div className="destinos__grid">
              {destinations.map((destination) => (
                <DestinationCard
                  key={destination.id}
                  slug={destination.slug}
                  title={destination.title}
                  subtitle={destination.subtitle}
                  state={destination.state}
                  heroImageUrl={destination.heroImageUrl}
                  heroImageBlurDataUrl={destination.heroImageBlurDataUrl}
                  headingLevel="h2"
                />
              ))}
            </div>
          ) : (
            <div className="destinos__empty" role="status">
              <p className="destinos__empty-title">Nenhum destino cadastrado</p>
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
