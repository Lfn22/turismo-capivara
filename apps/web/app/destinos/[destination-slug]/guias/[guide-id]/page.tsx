import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import SlotPicker from '@/src/components/ui/SlotPicker';

// ── Data layer ────────────────────────────────────────────────────────────────

const API_URL = process.env.API_URL ?? 'http://localhost:3333';

interface DepartureSlot {
  id: string;
  startsAt: string;
  capacity: number;
  booked: number;
  status: string;
}

interface GuidePackage {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  difficulty: string;
  departureSlots: DepartureSlot[];
}

interface GuideProfile {
  id: string;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  specialties: string[];
  regions: string[];
  portfolioPhotos: string[];
  tenantSlug: string;
  packages: GuidePackage[];
}

async function fetchGuideProfile(
  destinationSlug: string,
  guideId: string,
): Promise<GuideProfile | null> {
  try {
    const res = await fetch(
      `${API_URL}/destinations/${destinationSlug}/guides/${guideId}`,
      { next: { revalidate: 3600 } },
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ 'destination-slug': string; 'guide-id': string }>;
}): Promise<Metadata> {
  const { 'destination-slug': dSlug, 'guide-id': gId } = await params;
  const guide = await fetchGuideProfile(dSlug, gId);
  if (!guide) return { title: 'Guia não encontrado' };
  return {
    title: guide.name,
    description:
      guide.bio ??
      `Conheça ${guide.name} — guia certificado. ${guide.specialties.slice(0, 3).join(', ')}.`,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const FALLBACK_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiM5Qzc4NjAiLz48L3N2Zz4=';

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: 'Fácil',
  FACIL: 'Fácil',
  MODERATE: 'Moderado',
  MEDIUM: 'Moderado',
  MODERADO: 'Moderado',
  HARD: 'Difícil',
  DIFICIL: 'Difícil',
};


// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ 'destination-slug': string; 'guide-id': string }>;
}

export default async function GuideProfilePage({ params }: Props) {
  const { 'destination-slug': dSlug, 'guide-id': gId } = await params;
  const guide = await fetchGuideProfile(dSlug, gId);
  if (!guide) notFound();

  const roteiroBase = `/destinos/${dSlug}/roteiros`;

  return (
    <>
      <style>{`
        /* ── Reset & tokens ── */
        .gprofile * { box-sizing: border-box; }

        .gprofile {
          min-height: 100dvh;
          background: var(--stone-50, #fafaf9);
          font-family: var(--font-sans, system-ui, sans-serif);
        }

        /* ── Back nav ── */
        .gprofile__nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          padding: 0.875rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .gprofile__back {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #fff;
          text-decoration: none;
          background: rgba(28, 25, 23, 0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 100px;
          padding: 0.45rem 0.85rem 0.45rem 0.65rem;
          transition: background 0.2s;
        }

        .gprofile__back:hover {
          background: rgba(28, 25, 23, 0.8);
        }

        /* ── Hero ── */
        .gprofile__hero {
          position: relative;
          width: 100%;
          height: 70dvh;
          min-height: 420px;
          max-height: 680px;
          background: var(--stone-900, #1c1917);
          overflow: hidden;
        }

        .gprofile__hero-img {
          object-fit: cover;
          object-position: center top;
        }

        .gprofile__hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(28, 25, 23, 0.92) 0%,
            rgba(28, 25, 23, 0.3) 50%,
            transparent 100%
          );
        }

        .gprofile__hero-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(160deg, #3d2a1e 0%, #1c1917 100%);
          color: rgba(255,255,255,0.15);
        }

        .gprofile__hero-content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 2rem 1.5rem 2rem;
        }

        .gprofile__eyebrow {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ochre, #C8892A);
          margin: 0 0 0.5rem;
        }

        .gprofile__name {
          font-family: var(--font-display, Georgia, serif);
          font-size: clamp(2rem, 6vw, 3rem);
          font-weight: 700;
          color: #fff;
          line-height: 1.1;
          margin: 0 0 0.75rem;
        }

        .gprofile__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }

        .gprofile__tag {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.8);
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 2px;
          padding: 0.2rem 0.55rem;
        }

        /* ── About ── */
        .gprofile__about {
          background: #fff;
          border-bottom: 1px solid var(--stone-200, #e7e5e4);
          padding: 2rem 1.5rem;
        }

        .gprofile__about-inner {
          max-width: 640px;
          margin: 0 auto;
        }

        .gprofile__section-label {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ochre-dark, #9a6520);
          margin: 0 0 0.75rem;
        }

        .gprofile__bio {
          font-size: 1rem;
          line-height: 1.7;
          color: var(--stone-700, #44403c);
          margin: 0 0 1.25rem;
        }

        .gprofile__regions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }

        .gprofile__region {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--stone-600, #57534e);
          background: var(--stone-100, #f5f5f4);
          border: 1px solid var(--stone-200, #e7e5e4);
          border-radius: 2px;
          padding: 0.25rem 0.6rem;
        }

        /* ── Packages ── */
        .gprofile__packages {
          padding: 2.5rem 1.5rem;
          background: var(--stone-50, #fafaf9);
        }

        .gprofile__packages-inner {
          max-width: 1100px;
          margin: 0 auto;
        }

        .gprofile__packages-heading {
          font-family: var(--font-display, Georgia, serif);
          font-size: clamp(1.4rem, 4vw, 1.75rem);
          font-weight: 700;
          color: var(--stone-900, #1c1917);
          margin: 0 0 0.4rem;
        }

        .gprofile__packages-sub {
          font-size: 0.9rem;
          color: var(--stone-500, #78716c);
          margin: 0 0 1.75rem;
        }

        .gprofile__pkg-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
          gap: 1.25rem;
        }

        /* ── Empty state ── */
        .gprofile__empty {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--stone-500, #78716c);
        }

        .gprofile__empty-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--stone-700, #44403c);
          margin: 0 0 0.5rem;
        }

        /* ── CTA strip (no packages) ── */
        .gprofile__cta-strip {
          background: var(--stone-900, #1c1917);
          padding: 2.5rem 1.5rem;
          text-align: center;
        }

        .gprofile__cta-strip-text {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.6);
          margin: 0 0 1.25rem;
        }

        .gprofile__cta-strip-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--ochre, #C8892A);
          color: #fff;
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: 3px;
          padding: 0.8rem 2rem;
          transition: background 0.2s;
        }

        .gprofile__cta-strip-btn:hover {
          background: var(--ochre-dark, #9a6520);
        }

        /* ── Mobile ── */
        @media (min-width: 640px) {
          .gprofile__hero-content { padding: 2.5rem 2.5rem 2.5rem; }
          .gprofile__about { padding: 2.5rem 2.5rem; }
          .gprofile__packages { padding: 3rem 2.5rem; }
        }
      `}</style>

      <div className="gprofile">

        {/* ── Back navigation ─────────────────────────────────────── */}
        <nav className="gprofile__nav" aria-label="Navegação">
          <Link href={`/destinos/${dSlug}/guias`} className="gprofile__back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Guias
          </Link>
        </nav>

        {/* ── Hero ────────────────────────────────────────────────── */}
        <section className="gprofile__hero" aria-label={`Foto de ${guide.name}`}>
          {guide.photoUrl ? (
            <Image
              src={guide.photoUrl}
              alt={guide.name}
              fill
              priority
              sizes="100vw"
              placeholder="blur"
              blurDataURL={FALLBACK_BLUR}
              className="gprofile__hero-img"
            />
          ) : (
            <div className="gprofile__hero-placeholder" aria-hidden="true">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="0.75"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
          )}

          <div className="gprofile__hero-overlay" aria-hidden="true" />

          <div className="gprofile__hero-content">
            <p className="gprofile__eyebrow">Guia certificado</p>
            <h1 className="gprofile__name">{guide.name}</h1>
            {guide.specialties.length > 0 && (
              <div className="gprofile__tags" aria-label="Especialidades">
                {guide.specialties.map((s) => (
                  <span key={s} className="gprofile__tag">{s}</span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── About ───────────────────────────────────────────────── */}
        {(guide.bio || guide.regions.length > 0) && (
          <section className="gprofile__about" aria-labelledby="about-heading">
            <div className="gprofile__about-inner">
              {guide.bio && (
                <>
                  <p className="gprofile__section-label" id="about-heading">Sobre</p>
                  <p className="gprofile__bio">{guide.bio}</p>
                </>
              )}
              {guide.regions.length > 0 && (
                <>
                  <p className="gprofile__section-label">Regiões atendidas</p>
                  <div className="gprofile__regions" aria-label="Regiões">
                    {guide.regions.map((r) => (
                      <span key={r} className="gprofile__region">{r}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* ── Roteiros ────────────────────────────────────────────── */}
        <section id="roteiros" className="gprofile__packages" aria-labelledby="packages-heading">
          <div className="gprofile__packages-inner">
            <h2 className="gprofile__packages-heading" id="packages-heading">
              Roteiros deste guia
            </h2>
            <p className="gprofile__packages-sub">
              Escolha um roteiro e reserve sua experiência.
            </p>

            {guide.packages.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {guide.packages.map((pkg) => {
                  const openSlots = (pkg.departureSlots ?? []).filter(
                    (s) => s.status === 'OPEN' && s.booked < s.capacity
                  )
                  return (
                    <div
                      key={pkg.id}
                      style={{
                        border: '1px solid var(--stone-200)',
                        borderRadius: '8px',
                        padding: '1.5rem',
                        background: 'white',
                      }}
                    >
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--stone-900)', margin: '0 0 0.5rem' }}>
                        {pkg.name}
                      </h3>
                      {pkg.description && (
                        <p style={{ fontSize: '0.9rem', color: 'var(--stone-600)', margin: '0 0 0.75rem', lineHeight: 1.6 }}>
                          {pkg.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--stone-500)', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <span>{pkg.duration} min</span>
                        <span>R$ {pkg.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span>{DIFFICULTY_LABEL[pkg.difficulty] ?? pkg.difficulty}</span>
                      </div>
                      {openSlots.length > 0 ? (
                        <>
                          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--stone-700)' }}>
                            Datas disponíveis:
                          </p>
                          <SlotPicker slots={openSlots} packageId={pkg.id} slug={guide.tenantSlug} />
                        </>
                      ) : (
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--stone-500)' }}>
                          Nenhuma data disponível no momento.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="gprofile__empty" role="status">
                <p className="gprofile__empty-title">Sem roteiros cadastrados</p>
                <p>Entre em contato direto com o guia para combinar um roteiro personalizado.</p>
              </div>
            )}
          </div>
        </section>

        {/* ── CTA strip ───────────────────────────────────────────── */}
        {guide.packages.length > 0 && (
          <section className="gprofile__cta-strip" aria-label="Reserva geral">
            <p className="gprofile__cta-strip-text">
              Escolha um roteiro acima e faça sua reserva.
            </p>
            <Link
              href="#roteiros"
              aria-label={`Ver roteiros de ${guide.name}`}
              className="gprofile__cta-strip-btn"
            >
              Reservar com {guide.name}
            </Link>
          </section>
        )}

      </div>
    </>
  );
}
