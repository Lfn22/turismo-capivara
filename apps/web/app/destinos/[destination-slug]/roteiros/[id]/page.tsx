import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import GuideCard, { GuideCardGuide } from '@/src/components/ui/GuideCard';

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

// ── Revalidation ──────────────────────────────────────────────────────────────

export const revalidate = 300;

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
  const guides = await fetchPackageGuides(id);

  return (
    <>
      <style>{`
        /* ── Layout ── */
        .rdet {
          min-height: 100dvh;
          background: var(--stone-50, #fafaf9);
        }

        /* ── Header ── */
        .rdet__header {
          background: var(--stone-900, #1c1917);
          color: #fff;
          padding: clamp(48px, 8vw, 80px) clamp(16px, 5vw, 64px) clamp(32px, 5vw, 48px);
        }

        .rdet__breadcrumb {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--stone-400, #a8a29e);
          text-decoration: none;
          margin-bottom: 20px;
          transition: color 0.15s;
        }
        .rdet__breadcrumb:hover {
          color: #fff;
        }

        .rdet__eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ochre, #c2783c);
          margin: 0 0 8px;
        }

        .rdet__title {
          font-family: var(--font-display, Georgia, serif);
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 700;
          line-height: 1.15;
          margin: 0 0 8px;
          color: #fff;
        }

        .rdet__subtitle {
          font-size: 15px;
          color: var(--stone-400, #a8a29e);
          margin: 0;
        }

        /* ── Body ── */
        .rdet__body {
          max-width: 1120px;
          margin: 0 auto;
          padding: clamp(24px, 5vw, 48px) clamp(16px, 5vw, 64px);
        }

        /* ── Grid ── */
        .rdet__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }

        /* ── Count badge ── */
        .rdet__count {
          font-size: 13px;
          color: var(--stone-500, #78716c);
          margin: 0 0 24px;
        }
        .rdet__count strong {
          color: var(--stone-700, #44403c);
        }

        /* ── Mobile adjustments ── */
        @media (max-width: 480px) {
          .rdet__grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="rdet">
        {/* Header */}
        <header className="rdet__header">
          <Link href="/" style={{ display: 'inline-block', marginBottom: '12px' }}>
            <Image
              src="/images/logo.png"
              alt="CAPI"
              width={90}
              height={81}
              style={{ filter: 'brightness(0) invert(1)', display: 'block' }}
            />
          </Link>
          <Link href={`/destinos/${slug}/roteiros`} className="rdet__breadcrumb">
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
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Roteiros
          </Link>
          <p className="rdet__eyebrow">Roteiro</p>
          <h1 className="rdet__title">Guias deste roteiro</h1>
          <p className="rdet__subtitle">
            Escolha o guia ideal para sua aventura.
          </p>
        </header>

        {/* Body */}
        <main className="rdet__body">
          {guides.length > 0 ? (
            <>
              <p className="rdet__count">
                <strong>{guides.length}</strong>{' '}
                {guides.length === 1 ? 'guia disponível' : 'guias disponíveis'}
              </p>
              <div className="rdet__grid" id="guias">
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
            <div style={{ textAlign: 'center', padding: '64px 24px' }}>
              <p style={{ fontSize: '16px', color: 'var(--stone-500)', marginBottom: '8px' }}>
                Nenhum guia vinculado a este roteiro ainda.
              </p>
              <p style={{ fontSize: '14px', color: 'var(--stone-400)' }}>
                Em breve condutores estarão disponíveis para este roteiro.
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
