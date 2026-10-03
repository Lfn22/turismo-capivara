import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Mountain, Users } from 'lucide-react';
import GuideCard, { GuideCardGuide } from '@/src/components/ui/GuideCard';
import FloatingCTA from '@/src/components/roteiro/FloatingCTA';
import { TrackView } from '@/src/components/tracking/TrackView';
import {
  BookingSummary,
  Button,
  EmptyState,
  Media,
  StatusBadge,
  formatDuration,
  formatPrice,
} from '@/src/components/ui/capi';

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: 'Fácil',
  MODERATE: 'Moderado',
  HARD: 'Difícil',
};

// ── Data layer ────────────────────────────────────────────────────────────────

const API_URL = process.env.API_URL ?? 'http://localhost:3333';

interface ApiGuide {
  guideId: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  especialidades: string[];
  regioes: string[];
}

async function fetchPackageGuides(id: string): Promise<GuideCardGuide[]> {
  try {
    const res = await fetch(`${API_URL}/packages/${id}/guides`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const raw: ApiGuide[] = await res.json();
    if (!Array.isArray(raw)) return [];
    return raw.map((g): GuideCardGuide => ({
      id: g.guideId,
      name: g.name,
      photoUrl: g.photoUrl ?? null,
      photoBlurDataUrl: null,
      specialties: g.especialidades ?? [],
      packageCount: 0,
      rating: null,
      reviewCount: null,
    }));
  } catch {
    return [];
  }
}

// Campos já presentes na resposta de GET /destinations/:slug/packages (só o tipo foi detalhado).
interface PackageDetail {
  id: string;
  name: string;
  description: string;
  duration?: number; // minutes
  price?: number; // decimal, e.g. 120.00
  difficulty?: 'EASY' | 'MODERATE' | 'HARD';
  durationMinHours?: number | null;
  durationMaxHours?: number | null;
  tenantSlug?: string;
}

async function fetchPackageDetail(
  destinationSlug: string,
  packageId: string,
): Promise<PackageDetail | null> {
  try {
    const res = await fetch(`${API_URL}/destinations/${destinationSlug}/packages`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const packages = await res.json();
    if (!Array.isArray(packages)) return null;
    return packages.find((p: { id: string }) => p.id === packageId) ?? null;
  } catch {
    return null;
  }
}

// ── Revalidation ──────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ 'destination-slug': string; id: string }>;
}): Promise<Metadata> {
  const { 'destination-slug': slug } = await params;
  return {
    title: 'Guias deste roteiro',
    description: `Conheça os guias certificados disponíveis para este roteiro em ${slug}.`,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ 'destination-slug': string; id: string }>;
}

export default async function RoteiroDetailPage({ params }: Props) {
  const { 'destination-slug': slug, id } = await params;
  const [guides, pkg] = await Promise.all([
    fetchPackageGuides(id),
    fetchPackageDetail(slug, id),
  ]);

  const priceCents = pkg?.price != null ? Math.round(pkg.price * 100) : null; // decimal → cents
  const priceLabel = priceCents != null ? formatPrice(priceCents) : null;
  const durationLabel =
    pkg?.duration != null
      ? formatDuration(pkg.duration)
      : pkg?.durationMinHours != null && pkg?.durationMaxHours != null
        ? `${pkg.durationMinHours}–${pkg.durationMaxHours}h`
        : pkg?.durationMinHours != null
          ? `${pkg.durationMinHours}h`
          : pkg?.durationMaxHours != null
            ? `${pkg.durationMaxHours}h`
            : null;
  // Reserva acontece na página do roteiro da operadora (escolha de data e horário).
  const bookHref = pkg?.tenantSlug ? `/${pkg.tenantSlug}/roteiros/${pkg.id}` : '#guias';

  return (
    <>
      <TrackView event="package_viewed" properties={{ packageId: id, destinationSlug: slug }} />
      <style>{`
        .rdet { min-height: 100dvh; background: var(--bg-page); }
        .rdet__top { padding-top: calc(56px + var(--space-3)); }
        @media (min-width: 768px) { .rdet__top { padding-top: calc(var(--topbar-height) + var(--space-6)); } }
        .rdet__back {
          display: inline-flex; align-items: center; gap: 6px;
          min-height: var(--touch-target);
          font-size: 14px; font-weight: 600; text-decoration: none;
          color: var(--text-secondary);
          border-radius: var(--radius-sm);
        }
        .rdet__back:hover { color: var(--text); }

        /* Galeria: mídia única 4:3 no celular, 21:9 no desktop (sem fotos na API ainda) */
        .rdet__gallery { margin-top: var(--space-2); }
        @media (min-width: 768px) { .rdet__gallery .capi-media { aspect-ratio: 21 / 9 !important; } }

        .rdet__layout { display: grid; gap: var(--space-10); padding-block: var(--space-6) var(--space-16); }
        @media (min-width: 1024px) {
          .rdet__layout { grid-template-columns: minmax(0, 1fr) 360px; gap: var(--space-12); padding-top: var(--space-8); }
        }
        .rdet__aside { display: none; }
        @media (min-width: 1024px) {
          .rdet__aside { display: block; position: sticky; top: 96px; align-self: start; }
        }

        .rdet__head { display: flex; flex-direction: column; gap: var(--space-3); }
        .rdet__overline {
          font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
          color: var(--text-primary);
        }
        .rdet__title {
          font-family: var(--font-sans);
          font-size: clamp(26px, 4vw, 34px); font-weight: 700; line-height: 1.2; letter-spacing: -.015em;
          color: var(--text);
        }
        .rdet__meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-4); font-size: 14px; color: var(--text-secondary); }
        .rdet__meta > span { display: inline-flex; align-items: center; gap: 6px; }

        .rdet__facts { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); margin-top: var(--space-6); }
        .rdet__fact {
          display: flex; align-items: center; gap: var(--space-3);
          padding: var(--space-4);
          border: 1px solid var(--border); border-radius: var(--radius-lg);
          background: var(--surface);
        }
        .rdet__fact-icon {
          flex: none; display: inline-flex; align-items: center; justify-content: center;
          width: 40px; height: 40px; border-radius: var(--radius-md);
          background: var(--primary-subtle); color: var(--text-primary);
        }
        .rdet__fact-label { font-size: 12px; font-weight: 500; color: var(--text-secondary); }
        .rdet__fact-value { font-size: 15px; font-weight: 700; color: var(--text); }

        .rdet__section { padding-top: var(--space-8); margin-top: var(--space-8); border-top: 1px solid var(--border); scroll-margin-top: var(--space-20); }
        .rdet__h2 { margin-bottom: var(--space-4); font-size: 20px; font-weight: 700; color: var(--text); }
        .rdet__text { font-size: 16px; line-height: 1.7; color: var(--text-secondary); white-space: pre-line; }
        .rdet__count { margin-bottom: var(--space-4); font-size: 14px; color: var(--text-secondary); }
        .rdet__count strong { color: var(--text); }
        .rdet__guides { display: grid; gap: var(--space-3); }
        @media (min-width: 640px) and (max-width: 1023px) { .rdet__guides { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

        .rdet__price-from { font-size: 13px; color: var(--text-secondary); }
        .rdet__price { font-size: 28px; font-weight: 700; letter-spacing: -.02em; color: var(--text); font-variant-numeric: tabular-nums; }
        .rdet__price-unit { font-size: 14px; font-weight: 500; color: var(--text-secondary); }
      `}</style>

      <main className="rdet capi-has-bottombar capi-has-bottombar--book">
        <div className="capi-container rdet__top">
          <Link href={`/destinos/${slug}/roteiros`} className="rdet__back">
            <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
            Roteiros
          </Link>

          <div className="rdet__gallery">
            <Media alt={pkg?.name ?? 'Roteiro'} ratio="4 / 3" placeholder="mountain" priority />
          </div>
        </div>

        <div className="capi-container">
          <div className="rdet__layout">
            {/* ── Conteúdo ─────────────────────────────────────── */}
            <div>
              <header className="rdet__head">
                <p className="rdet__overline">Roteiro</p>
                <h1 className="rdet__title">{pkg?.name ?? 'Guias deste roteiro'}</h1>
                {pkg?.difficulty ? (
                  <div className="rdet__meta">
                    <StatusBadge kind="difficulty" status={pkg.difficulty} />
                  </div>
                ) : null}
              </header>

              {(durationLabel || pkg?.difficulty || guides.length > 0) && (
                <div className="rdet__facts">
                  {durationLabel ? (
                    <div className="rdet__fact">
                      <span className="rdet__fact-icon" aria-hidden="true"><Clock size={20} strokeWidth={1.75} /></span>
                      <div>
                        <p className="rdet__fact-label">Duração</p>
                        <p className="rdet__fact-value">{durationLabel}</p>
                      </div>
                    </div>
                  ) : null}
                  {pkg?.difficulty ? (
                    <div className="rdet__fact">
                      <span className="rdet__fact-icon" aria-hidden="true"><Mountain size={20} strokeWidth={1.75} /></span>
                      <div>
                        <p className="rdet__fact-label">Dificuldade</p>
                        <p className="rdet__fact-value">{DIFFICULTY_LABEL[pkg.difficulty] ?? pkg.difficulty}</p>
                      </div>
                    </div>
                  ) : null}
                  <div className="rdet__fact">
                    <span className="rdet__fact-icon" aria-hidden="true"><Users size={20} strokeWidth={1.75} /></span>
                    <div>
                      <p className="rdet__fact-label">Guias</p>
                      <p className="rdet__fact-value">
                        {guides.length} {guides.length === 1 ? 'disponível' : 'disponíveis'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <section className="rdet__section" aria-labelledby="sobre-heading">
                <h2 id="sobre-heading" className="rdet__h2">Sobre</h2>
                <p className="rdet__text">
                  {pkg?.description ?? 'Escolha o guia ideal para sua aventura.'}
                </p>
              </section>

              <section id="guias" className="rdet__section" aria-labelledby="guias-heading">
                <h2 id="guias-heading" className="rdet__h2">
                  {guides.length === 1 ? 'Seu guia' : 'Guias deste roteiro'}
                </h2>
                {guides.length > 0 ? (
                  <>
                    {guides.length > 1 ? (
                      <p className="rdet__count">
                        <strong>{guides.length}</strong> guias disponíveis
                      </p>
                    ) : null}
                    <div className="rdet__guides">
                      {guides.map((guide) => (
                        <GuideCard
                          key={guide.id}
                          guide={guide}
                          href={`/destinos/${slug}/guias/${guide.id}`}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState
                    compact
                    icon={Users}
                    title="Nenhum guia vinculado a este roteiro ainda"
                    description="Em breve condutores estarão disponíveis para este roteiro."
                  />
                )}
              </section>
            </div>

            {/* ── Coluna lateral (≥ 1024px) ────────────────────── */}
            {priceLabel ? (
              <div className="rdet__aside">
                <BookingSummary
                  title={pkg?.name}
                  details={[
                    ...(durationLabel ? [{ label: 'Duração', value: durationLabel }] : []),
                    ...(pkg?.difficulty
                      ? [{ label: 'Dificuldade', value: DIFFICULTY_LABEL[pkg.difficulty] ?? pkg.difficulty }]
                      : []),
                  ]}
                  totalLabel="A partir de"
                  total={
                    <>
                      {priceLabel}
                      <span className="rdet__price-unit"> /pessoa</span>
                    </>
                  }
                  action={
                    <Button href={bookHref} size="lg" fullWidth>
                      Reservar
                    </Button>
                  }
                  note="Você escolhe a data e o horário na próxima etapa."
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Barra de reserva (celular) ──────────────────────── */}
        {priceLabel ? <FloatingCTA price={priceLabel} label="/pessoa" href={bookHref} /> : null}
      </main>
    </>
  );
}
