import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import DestinationHero, { DestinationTabs } from '@/src/components/ui/DestinationHero';
import DestinationHighlights from '@/src/components/ui/DestinationHighlights';
import StickyDestinationNav from '@/src/components/layout/StickyDestinationNav';
import PublicLayout from '@/src/components/layout/PublicLayout';
import { Button } from '@/src/components/ui/capi';
import MapWidgetClient, { type PartnerData } from '@/src/components/ui/MapWidgetClient';

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
  lat: number | null;
  lng: number | null;
  highlights: string[];
  heroImageUrl: string | null;
  heroImageBlurDataUrl: string | null;
  photos: string[];
  tagline: string | null;
}

async function fetchDestination(slug: string): Promise<Destination | null> {
  try {
    const res = await fetch(`${API_URL}/destinations/${slug}`, {
      next: { revalidate: 60 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// TODO: fetchPartners — endpoint GET /destinations/:slug/tenants não existe na API ainda.
// A rota e os campos lat/lng no model Tenant precisam ser criados em fase futura.
// Por ora, partners é sempre [].
async function fetchPartners(_destinationSlug: string): Promise<PartnerData[]> {
  return []
}

// ── Static params (ISR) ───────────────────────────────────────────────────────

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/destinations`, {
      next: { revalidate: 60 },
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

export default async function DestinationPage({ params }: Props) {
  const { 'destination-slug': slug } = await params;
  const destination = await fetchDestination(slug);
  if (!destination) notFound();

  const partners = destination.lat && destination.lng
    ? await fetchPartners(slug)
    : []

  const guidesHref = `/destinos/${slug}/roteiros`;
  const highlights = destination.highlights ?? [];
  const photos = destination.photos ?? [];
  const hasMap = Boolean(destination.lat && destination.lng);

  // Texto descritivo: split em parágrafos (separa por \n\n ou usa como único §)
  const descriptionParagraphs = destination.description
    ? destination.description.split(/\n\n+/).filter(Boolean)
    : [];

  return (
    <PublicLayout>
      <style>{`
        .dest { background: var(--bg-page); }
        .dest__section { padding-block: var(--space-10); scroll-margin-top: var(--space-16); }
        @media (min-width: 768px) { .dest__section { padding-block: var(--space-16); } }
        .dest__section + .dest__section { border-top: 1px solid var(--border); }

        .dest__overline {
          margin-bottom: var(--space-2);
          font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
          color: var(--text-primary);
        }
        .dest__h2 {
          margin-bottom: var(--space-5);
          font-family: var(--font-display);
          font-size: clamp(28px, 4vw, 36px); font-weight: 700; line-height: 1.15; letter-spacing: -.015em;
          color: var(--text);
        }
        .dest__h2 em { font-style: italic; color: var(--text-primary); }

        .dest__about { display: grid; gap: var(--space-8); }
        @media (min-width: 1024px) { .dest__about { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: var(--space-12); } }
        .dest__text p { font-size: 16px; line-height: 1.7; color: var(--text-secondary); }
        .dest__text p + p { margin-top: var(--space-4); }
        @media (min-width: 768px) { .dest__text p { font-size: 17px; } }
        .dest__aside {
          align-self: start;
          padding: var(--space-5);
          border: 1px solid var(--border); border-radius: var(--radius-lg);
          background: var(--surface);
        }
        .dest__aside-title { margin-bottom: var(--space-4); font-size: 16px; font-weight: 700; color: var(--text); }

        .dest__poi {
          position: relative; overflow: hidden;
          aspect-ratio: 4 / 5;
          border-radius: var(--radius-lg);
          background: var(--surface-brand);
        }
        .dest__poi-bg { position: absolute; inset: 0; background-size: cover; background-position: center; transition: transform .5s cubic-bezier(.16,1,.3,1); }
        .dest__poi:hover .dest__poi-bg { transform: scale(1.04); }
        .dest__poi-overlay {
          position: absolute; inset: auto 0 0 0;
          display: flex; align-items: flex-end;
          min-height: 50%;
          padding: var(--space-4);
          background: linear-gradient(to top, var(--scrim-photo), transparent);
        }
        .dest__poi-name {
          font-family: var(--font-display);
          font-size: 22px; font-weight: 700; line-height: 1.15;
          color: var(--text-on-brand);
        }

        .dest__cta {
          display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-4);
          padding: var(--space-8) var(--space-6);
          border-radius: var(--radius-xl);
          background: var(--surface-brand);
          color: var(--text-on-brand);
        }
        @media (min-width: 768px) {
          .dest__cta { flex-direction: row; align-items: center; justify-content: space-between; padding: var(--space-10) var(--space-12); }
        }
        .dest__cta-title {
          font-family: var(--font-display);
          font-size: clamp(26px, 3.5vw, 34px); font-weight: 700; line-height: 1.15;
          color: var(--text-on-brand);
        }
        .dest__cta-sub { margin-top: var(--space-2); max-width: 52ch; font-size: 15px; line-height: 1.6; color: var(--text-on-brand-secondary); }
        .dest__cta-actions { display: flex; flex-wrap: wrap; gap: var(--space-3); flex: none; }

        @media (prefers-reduced-motion: reduce) {
          .dest__poi:hover .dest__poi-bg { transform: none; }
        }
      `}</style>

      {/* ── Nav sticky ─────────────────────────────────────────── */}
      <StickyDestinationNav
        destinationName={destination.title}
        destinationSlug={slug}
      />

      <main className="dest">
        {/* ── 1. Hero ──────────────────────────────────────────── */}
        <DestinationHero
          title={destination.title}
          subtitle={destination.subtitle}
          state={destination.state}
          heroImageUrl={destination.heroImageUrl}
          heroImageBlurDataUrl={destination.heroImageBlurDataUrl}
        />

        {/* ── 2. Abas sticky ───────────────────────────────────── */}
        <DestinationTabs slug={slug} active="sobre" showMap={hasMap} />

        {/* ── 3. Sobre ─────────────────────────────────────────── */}
        <section id="sobre" className="dest__section" aria-labelledby="sobre-heading">
          <div className="capi-container">
            <div className="dest__about">
              <div>
                <p className="dest__overline">Sobre o destino</p>
                <h2 id="sobre-heading" className="dest__h2">
                  {destination.tagline ?? <>Um lugar que <em>transforma</em> quem visita</>}
                </h2>
                {descriptionParagraphs.length > 0 ? (
                  <div className="dest__text">
                    {descriptionParagraphs.map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-fg-secondary">
                    Explore {destination.title} com guias certificados. {destination.state}.
                  </p>
                )}
              </div>

              {highlights.length > 0 && (
                <aside className="dest__aside" aria-label="Destaques">
                  <p className="dest__aside-title">
                    {highlights.length} {highlights.length === 1 ? 'ponto de interesse' : 'pontos de interesse'}
                  </p>
                  <DestinationHighlights highlights={highlights} />
                </aside>
              )}
            </div>
          </div>
        </section>

        {/* ── 4. Pontos de interesse (fotos) ───────────────────── */}
        {highlights.length > 0 && (
          <section className="dest__section" aria-labelledby="poi-heading">
            <div className="capi-container">
              <p className="dest__overline">O que explorar</p>
              <h2 id="poi-heading" className="dest__h2">Pontos de interesse</h2>
              <div className="capi-scroller">
                {highlights.map((highlight, i) => {
                  const photo = photos[i] ? safePhotoUrl(photos[i]) : null;
                  return (
                    <div key={highlight} className="dest__poi">
                      {photo ? (
                        <div
                          className="dest__poi-bg"
                          style={{ backgroundImage: `url(${photo})` }}
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="dest__poi-overlay">
                        <h3 className="dest__poi-name">{highlight}</h3>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── 5. Mapa ──────────────────────────────────────────── */}
        {hasMap && (
          <section id="mapa" className="dest__section" aria-labelledby="mapa-heading">
            <div className="capi-container">
              <p className="dest__overline">Como chegar</p>
              <h2 id="mapa-heading" className="dest__h2">Mapa</h2>
              <MapWidgetClient
                lat={destination.lat as number}
                lng={destination.lng as number}
                partners={partners}
                destinationName={destination.title}
              />
            </div>
          </section>
        )}

        {/* ── 6. CTA — Roteiros ────────────────────────────────── */}
        <section className="dest__section" aria-labelledby="cta-heading">
          <div className="capi-container">
            <div className="dest__cta">
              <div>
                <h2 id="cta-heading" className="dest__cta-title">
                  Pronto para explorar {destination.title}?
                </h2>
                <p className="dest__cta-sub">
                  Descubra os roteiros disponíveis em {destination.title}. Compare duração, dificuldade e preço — e reserve com guias certificados.
                </p>
              </div>
              <div className="dest__cta-actions">
                <Button href={guidesHref} size="lg" iconRight={ArrowRight}>
                  Ver roteiros
                </Button>
                <Button href={`/destinos/${slug}/guias`} size="lg" variant="secondary">
                  Conhecer os guias
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
