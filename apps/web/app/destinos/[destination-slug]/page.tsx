import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DestinationHero from '@/src/components/ui/DestinationHero';
import StickyDestinationNav from '@/src/components/layout/StickyDestinationNav';
import BackButton from '@/src/components/ui/BackButton';
import DestinationPhotoEditor from '@/components/ui/DestinationPhotoEditor';

// ── Helpers ───────────────────────────────────────────────────────────────────

const safePhotoUrl = (url: string) => /^https?:\/\//.test(url) ? url : null

// ── Data layer ────────────────────────────────────────────────────────────────

const API_URL = process.env.API_URL ?? 'http://localhost:3333';

interface Destination {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  state: string;
  highlights: string[];
  heroImageUrl: string | null;
  heroImageBlurDataUrl: string | null;
  photos: string[];
  tagline: string | null;
}

async function fetchDestination(slug: string): Promise<Destination | null> {
  try {
    const res = await fetch(`${API_URL}/destinations/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Static params (ISR) ───────────────────────────────────────────────────────

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/destinations`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const destinations: { slug: string }[] = await res.json();
    return destinations.map((d) => ({ 'destination-slug': d.slug }));
  } catch {
    return [];
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ 'destination-slug': string }>;
}): Promise<Metadata> {
  const { 'destination-slug': slug } = await params;
  const destination = await fetchDestination(slug);
  if (!destination) return { title: 'Destino não encontrado' };
  return {
    title: destination.title,
    description:
      destination.description ||
      `Explore ${destination.title} com guias certificados. ${destination.state}.`,
    openGraph: {
      title: destination.title,
      description: destination.subtitle ?? undefined,
      images: destination.heroImageUrl ? [destination.heroImageUrl] : [],
      locale: 'pt_BR',
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ 'destination-slug': string }>;
}

// Paleta de gradientes para cards de highlights sem imagem
const HIGHLIGHT_GRADIENTS = [
  'linear-gradient(160deg, #5C3D2A 0%, #1c1917 100%)',
  'linear-gradient(160deg, #3d4a2a 0%, #1c1917 100%)',
  'linear-gradient(160deg, #2a3d4a 0%, #1c1917 100%)',
  'linear-gradient(160deg, #4a2a3d 0%, #1c1917 100%)',
  'linear-gradient(160deg, #3d2a4a 0%, #1c1917 100%)',
  'linear-gradient(160deg, #4a3d2a 0%, #1c1917 100%)',
];

export default async function DestinationPage({ params }: Props) {
  const { 'destination-slug': slug } = await params;
  const destination = await fetchDestination(slug);
  if (!destination) notFound();

  const guidesHref = `/destinos/${slug}/guias`;
  const highlights = destination.highlights ?? [];
  const photos = destination.photos ?? [];

  // Texto descritivo: split em parágrafos (separa por \n\n ou usa como único §)
  const descriptionParagraphs = destination.description
    ? destination.description.split(/\n\n+/).filter(Boolean)
    : [];

  return (
    <>
      <style>{`
        /* ── Reset ── */
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Storytelling ── */
        .story-section {
          background: var(--stone-50, #fafaf9);
          padding: clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3.5rem);
        }

        .story-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(3rem, 6vw, 7rem);
          align-items: start;
        }

        .story-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ochre, #c8961c);
          margin-bottom: 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .story-label::before {
          content: '';
          display: block;
          width: 24px;
          height: 1px;
          background: var(--ochre, #c8961c);
          flex-shrink: 0;
        }

        .story-heading {
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.025em;
          color: var(--stone-900, #1c1917);
          margin-bottom: 2rem;
        }

        .story-heading em {
          font-style: italic;
          color: var(--ochre-dark, #a07010);
        }

        .story-text p {
          font-size: clamp(0.95rem, 1.5vw, 1.05rem);
          line-height: 1.8;
          color: var(--stone-600, #57534e);
          margin-bottom: 1.25rem;
        }

        .story-text p:last-child { margin-bottom: 0; }

        /* Card visual lateral */
        .story-visual {
          position: sticky;
          top: 2rem;
        }

        .story-card {
          border-radius: 4px;
          overflow: hidden;
          background: var(--stone-900, #1c1917);
          aspect-ratio: 3/4;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 2rem;
        }

        .story-card-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(160deg, var(--stone-700, #44403c) 0%, var(--ochre-dark, #a07010) 50%, var(--stone-900, #1c1917) 100%);
          opacity: 0.85;
        }

        .story-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%);
        }

        .story-card-content {
          position: relative;
          z-index: 1;
        }

        .story-card-eyebrow {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ochre-light, #e0b84a);
          margin-bottom: 0.75rem;
        }

        .story-card-title {
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 700;
          color: #fff;
          line-height: 1.15;
          letter-spacing: -0.02em;
        }

        .story-card-stat {
          font-size: clamp(3rem, 6vw, 4.5rem);
          font-weight: 800;
          color: #fff;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .story-card-label {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.6);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-top: 0.4rem;
        }

        .story-highlights {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 2rem;
        }

        .story-highlight-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
          color: var(--stone-500, #78716c);
        }

        .story-highlight-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--ochre, #c8961c);
          flex-shrink: 0;
        }

        /* Mobile: stack em coluna */
        @media (max-width: 768px) {
          .story-inner {
            grid-template-columns: 1fr;
          }
          .story-visual {
            position: static;
            order: -1;
          }
          .story-card {
            aspect-ratio: 16/9;
            padding: 1.5rem;
          }
          .story-card-stat {
            font-size: 2.5rem;
          }
        }

        /* ── Highlights section (dark) ── */
        .highlights-section {
          background: var(--stone-900, #1c1917);
          padding: clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3.5rem);
        }

        .highlights-header {
          max-width: 1100px;
          margin: 0 auto;
          margin-bottom: clamp(2.5rem, 5vw, 4rem);
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .highlights-eyebrow {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ochre-light, #e0b84a);
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .highlights-eyebrow::before {
          content: '';
          display: block;
          width: 24px;
          height: 1px;
          background: var(--ochre-light, #e0b84a);
        }

        .highlights-heading {
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          font-weight: 700;
          letter-spacing: -0.025em;
          color: var(--stone-50, #fafaf9);
          line-height: 1.1;
        }

        .highlights-grid {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1.5px;
        }

        .highlight-card {
          position: relative;
          aspect-ratio: 2/3;
          overflow: hidden;
          background: var(--stone-800, #292524);
        }

        .highlight-card-bg {
          position: absolute;
          inset: 0;
          transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .highlight-card:hover .highlight-card-bg {
          transform: scale(1.04);
        }

        .highlight-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 55%);
          z-index: 1;
        }

        .highlight-card-content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 2;
          padding: clamp(1.25rem, 3vw, 2rem);
        }

        .highlight-card-name {
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(1.1rem, 2.2vw, 1.5rem);
          font-weight: 700;
          color: #fff;
          line-height: 1.2;
          letter-spacing: -0.015em;
        }

        @media (max-width: 768px) {
          .highlights-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .highlights-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .highlights-grid {
            grid-template-columns: 1fr;
          }
          .highlight-card {
            aspect-ratio: 3/2;
          }
        }

        /* ── CTA — Guias ── */
        .guides-cta {
          background: var(--stone-50, #fafaf9);
          border-top: 1px solid var(--stone-200, #e7e5e4);
          padding: clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 3.5rem);
          text-align: center;
        }

        .guides-cta__inner {
          max-width: 560px;
          margin: 0 auto;
        }

        .guides-cta__eyebrow {
          font-size: 0.66rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ochre, #c8961c);
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
        }

        .guides-cta__eyebrow::before,
        .guides-cta__eyebrow::after {
          content: '';
          display: block;
          width: 24px;
          height: 1px;
          background: var(--ochre, #c8961c);
          flex-shrink: 0;
        }

        .guides-cta__heading {
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(1.6rem, 3.5vw, 2.4rem);
          font-weight: 700;
          letter-spacing: -0.025em;
          color: var(--stone-900, #1c1917);
          line-height: 1.15;
          margin-bottom: 0.75rem;
        }

        .guides-cta__sub {
          font-size: clamp(0.88rem, 1.5vw, 1rem);
          color: var(--stone-500, #78716c);
          line-height: 1.7;
          margin-bottom: 2rem;
        }

        .guides-cta__btn {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--stone-900, #1c1917);
          background: var(--ochre, #c8961c);
          text-decoration: none;
          padding: 1rem 2.25rem;
          border-radius: 2px;
          transition: background 0.2s, transform 0.15s;
        }

        .guides-cta__btn:hover {
          background: var(--ochre-dark, #a07010);
          transform: translateY(-1px);
        }

        @media (max-width: 480px) {
          .guides-cta__btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      {/* ── Nav sticky ─────────────────────────────────────────── */}
      <StickyDestinationNav
        destinationName={destination.title}
        destinationSlug={slug}
        guidesHref={guidesHref}
      />

      {/* ── 1. Hero cinematográfico ─────────────────────────────── */}
      <DestinationHero
        title={destination.title}
        subtitle={destination.subtitle}
        state={destination.state}
        heroImageUrl={destination.heroImageUrl}
        heroImageBlurDataUrl={destination.heroImageBlurDataUrl}
      />

      {/* ── Back navigation ─────────────────────────────────────── */}
      <div style={{ padding: '1.25rem clamp(1.5rem, 5vw, 3.5rem) 0', background: 'var(--stone-50)' }}>
        <BackButton />
      </div>

      {/* ── 2. Storytelling ─────────────────────────────────────── */}
      {(descriptionParagraphs.length > 0 || highlights.length > 0) && (
        <section className="story-section">
          <div className="story-inner">
            {/* Texto */}
            <div>
              <p className="story-label">Sobre o destino</p>
              <h2 className="story-heading">
                {destination.tagline ?? <>Um lugar que <em>transforma</em> quem visita</>}
              </h2>
              {descriptionParagraphs.length > 0 ? (
                <div className="story-text">
                  {descriptionParagraphs.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              ) : null}
              {highlights.length > 0 && (
                <div className="story-highlights">
                  {highlights.map((h) => (
                    <div key={h} className="story-highlight-item">
                      <div className="story-highlight-dot" aria-hidden="true" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card visual */}
            <div className="story-visual" aria-hidden="true">
              <div className="story-card">
                <div className="story-card-bg" />
                <div className="story-card-overlay" />
                <div className="story-card-content">
                  <p className="story-card-eyebrow">{destination.state}</p>
                  {highlights.length > 0 ? (
                    <>
                      <p className="story-card-stat">{highlights.length}</p>
                      <p className="story-card-label">
                        {highlights.length === 1 ? 'ponto de interesse' : 'pontos de interesse'}
                      </p>
                    </>
                  ) : (
                    <p className="story-card-title">{destination.title}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 3. Highlights (dark) ────────────────────────────────── */}
      {highlights.length > 0 && (
        <section className="highlights-section">
          <div className="highlights-header">
            <div>
              <p className="highlights-eyebrow">O que explorar</p>
              <h2 className="highlights-heading">Pontos de interesse</h2>
            </div>
          </div>
          <div className="highlights-grid">
            {highlights.map((highlight, i) => (
              <div key={highlight} className="highlight-card">
                <div
                  className="highlight-card-bg"
                  style={safePhotoUrl(photos[i])
                    ? { backgroundImage: `url(${safePhotoUrl(photos[i])})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : { background: HIGHLIGHT_GRADIENTS[i % HIGHLIGHT_GRADIENTS.length] }}
                />
                <div className="highlight-card-overlay" />
                <div className="highlight-card-content">
                  <h3 className="highlight-card-name">{highlight}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 4. CTA — Guias ──────────────────────────────────────── */}
      <section className="guides-cta">
        <div className="guides-cta__inner">
          <p className="guides-cta__eyebrow">Guias certificados</p>
          <h2 className="guides-cta__heading">
            Pronto para explorar {destination.title}?
          </h2>
          <p className="guides-cta__sub">
            Conheça os guias locais certificados. Compare especialidades, roteiros e
            avaliações — e reserve com pagamento integrado.
          </p>
          <Link href={guidesHref} className="guides-cta__btn">
            Ver guias disponíveis
            <svg
              width="14"
              height="14"
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
          </Link>
        </div>
      </section>
      <DestinationPhotoEditor
        slug={slug}
        heroImageUrl={destination.heroImageUrl}
        photos={photos}
        title={destination.title}
        subtitle={destination.subtitle}
        description={destination.description}
        highlights={highlights}
        tagline={destination.tagline}
      />
    </>
  );
}
