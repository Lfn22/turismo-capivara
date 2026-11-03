import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Clock, MapPin, Route } from 'lucide-react';
import SlotPicker from '@/src/components/ui/SlotPicker';
import PublicLayout from '@/src/components/layout/PublicLayout';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  StatusBadge,
  TopNav,
  formatDuration,
  formatPrice,
} from '@/src/components/ui/capi';

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

// Normaliza variações vindas da API para o enum de dificuldade do StatusBadge.
const DIFFICULTY_KEY: Record<string, string> = {
  EASY: 'EASY',
  FACIL: 'EASY',
  MODERATE: 'MODERATE',
  MEDIUM: 'MODERATE',
  MODERADO: 'MODERATE',
  HARD: 'HARD',
  DIFICIL: 'HARD',
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
    <PublicLayout>
      <style>{`
        .gprofile { min-height: 100dvh; background: var(--bg-page); }
        .gprofile__navlogo img { height: 36px; width: auto; display: block; }

        .gprofile__header { padding-block: var(--space-8); }
        @media (min-width: 768px) { .gprofile__header { padding-block: var(--space-12) var(--space-10); } }
        .gprofile__identity { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-4); }
        @media (min-width: 640px) { .gprofile__identity { flex-direction: row; align-items: center; gap: var(--space-6); } }
        .gprofile__eyebrow {
          margin-bottom: var(--space-1);
          font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
          color: var(--text-primary);
        }
        .gprofile__name {
          font-family: var(--font-display);
          font-size: clamp(30px, 5vw, 42px); font-weight: 700; line-height: 1.1;
          color: var(--text);
        }
        .gprofile__tags { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-3); }

        .gprofile__section { padding-block: var(--space-8); border-top: 1px solid var(--border); scroll-margin-top: var(--space-16); }
        @media (min-width: 768px) { .gprofile__section { padding-block: var(--space-12); } }
        .gprofile__h2 {
          margin-bottom: var(--space-2);
          font-family: var(--font-display);
          font-size: clamp(24px, 3.5vw, 30px); font-weight: 700; line-height: 1.2;
          color: var(--text);
        }
        .gprofile__sub { margin-bottom: var(--space-6); font-size: 15px; color: var(--text-secondary); }
        .gprofile__label { margin-bottom: var(--space-3); font-size: 14px; font-weight: 700; color: var(--text); }
        .gprofile__bio { max-width: 68ch; font-size: 16px; line-height: 1.7; color: var(--text-secondary); white-space: pre-line; }
        .gprofile__bio + .gprofile__label { margin-top: var(--space-6); }

        .gprofile__pkgs { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); }
        .gprofile__pkg {
          display: flex; flex-direction: column; gap: var(--space-3);
          padding: var(--space-5);
          border: 1px solid var(--border); border-radius: var(--radius-lg);
          background: var(--surface);
        }
        .gprofile__pkg-top { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); }
        .gprofile__pkg-title { font-size: 17px; font-weight: 600; line-height: 1.35; color: var(--text); }
        .gprofile__pkg-desc { font-size: 14px; line-height: 1.6; color: var(--text-secondary); }
        .gprofile__pkg-meta { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); font-size: 14px; color: var(--text-secondary); }
        .gprofile__pkg-meta > span { display: inline-flex; align-items: center; gap: 6px; }
        .gprofile__pkg-meta strong { color: var(--text); font-weight: 700; }
        .gprofile__slots { padding-top: var(--space-3); border-top: 1px solid var(--border); }
        .gprofile__slots-label { margin-bottom: var(--space-2); font-size: 13px; font-weight: 600; color: var(--text); }
        .gprofile__noslots { font-size: 14px; color: var(--text-secondary); }

        .gprofile__cta {
          display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-4);
          padding: var(--space-6);
          border-radius: var(--radius-xl);
          background: var(--surface-brand);
          color: var(--text-on-brand);
        }
        @media (min-width: 768px) { .gprofile__cta { flex-direction: row; align-items: center; justify-content: space-between; padding: var(--space-8) var(--space-10); } }
        .gprofile__cta-text { font-size: 16px; font-weight: 500; color: var(--text-on-brand); }
      `}</style>

      <div className="gprofile">
        {/* ── Navegação ───────────────────────────────────────────── */}
        <TopNav
          logo={
            <Link
              href="/"
              aria-label="CAPI — página inicial"
              className="gprofile__navlogo inline-flex items-center"
              style={{ minHeight: 'var(--touch-target)' }}
            >
              <Image src="/images/logo.png" alt="CAPI" width={40} height={36} priority />
            </Link>
          }
          actions={
            <Button href={`/destinos/${dSlug}/guias`} variant="ghost" size="sm" iconLeft={ArrowLeft}>
              Guias
            </Button>
          }
        />

        <main>
          {/* ── Cabeçalho do guia ─────────────────────────────────── */}
          <header className="capi-container capi-container--content gprofile__header">
            <div className="gprofile__identity">
              <Avatar name={guide.name} src={guide.photoUrl} size={96} verified />
              <div>
                <p className="gprofile__eyebrow">Guia certificado</p>
                <h1 className="gprofile__name">{guide.name}</h1>
                {guide.specialties.length > 0 && (
                  <div className="gprofile__tags" aria-label="Especialidades">
                    {guide.specialties.map((s) => (
                      <Badge key={s} tone="brand">{s}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ── Sobre ─────────────────────────────────────────────── */}
          {(guide.bio || guide.regions.length > 0) && (
            <section className="gprofile__section" aria-labelledby="about-heading">
              <div className="capi-container capi-container--content">
                <h2 className="gprofile__h2 mb-4" id="about-heading">Sobre</h2>
                {guide.bio && <p className="gprofile__bio">{guide.bio}</p>}
                {guide.regions.length > 0 && (
                  <>
                    <p className="gprofile__label">Regiões atendidas</p>
                    <div className="gprofile__tags" aria-label="Regiões">
                      {guide.regions.map((r) => (
                        <Badge key={r} icon={MapPin}>{r}</Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* ── Roteiros ──────────────────────────────────────────── */}
          <section id="roteiros" className="gprofile__section" aria-labelledby="packages-heading">
            <div className="capi-container capi-container--content">
              <h2 className="gprofile__h2" id="packages-heading">
                Roteiros deste guia
              </h2>
              <p className="gprofile__sub">
                Escolha um roteiro e reserve sua experiência.
              </p>

              {guide.packages.length > 0 ? (
                <div className="gprofile__pkgs">
                  {guide.packages.map((pkg) => {
                    const openSlots = (pkg.departureSlots ?? []).filter(
                      (s) => s.status === 'OPEN' && s.booked < s.capacity
                    )
                    const difficulty = DIFFICULTY_KEY[pkg.difficulty] ?? pkg.difficulty
                    return (
                      <article key={pkg.id} className="gprofile__pkg">
                        <div className="gprofile__pkg-top">
                          <h3 className="gprofile__pkg-title">{pkg.name}</h3>
                          {pkg.difficulty ? <StatusBadge kind="difficulty" status={difficulty} /> : null}
                        </div>
                        {pkg.description && (
                          <p className="gprofile__pkg-desc">{pkg.description}</p>
                        )}
                        <p className="gprofile__pkg-meta">
                          <span>
                            <Clock size={16} strokeWidth={1.75} aria-hidden="true" />
                            {formatDuration(pkg.duration * 60)}
                          </span>
                          <span>
                            <strong>{formatPrice(Math.round(pkg.price * 100))}</strong>
                          </span>
                        </p>
                        <div className="gprofile__slots">
                          {openSlots.length > 0 ? (
                            <>
                              <p className="gprofile__slots-label">Datas disponíveis</p>
                              <SlotPicker slots={openSlots} packageId={pkg.id} slug={guide.tenantSlug} />
                            </>
                          ) : (
                            <p className="gprofile__noslots">
                              Nenhuma data disponível no momento.
                            </p>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={Route}
                  title="Sem roteiros cadastrados"
                  description="Entre em contato direto com o guia para combinar um roteiro personalizado."
                />
              )}
            </div>
          </section>

          {/* ── CTA ───────────────────────────────────────────────── */}
          {guide.packages.length > 0 && (
            <section className="pb-16" aria-label="Reserva geral">
              <div className="capi-container capi-container--content">
                <div className="gprofile__cta">
                  <p className="gprofile__cta-text">
                    Escolha um roteiro acima e faça sua reserva.
                  </p>
                  <Button href="#roteiros" variant="secondary">
                    Reservar com {guide.name}
                  </Button>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </PublicLayout>
  );
}
