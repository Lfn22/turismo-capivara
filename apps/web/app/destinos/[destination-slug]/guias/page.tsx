import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import GuideCard, { GuideCardGuide } from '@/src/components/ui/GuideCard';

// ── Data layer ────────────────────────────────────────────────────────────────

const API_URL = process.env.API_URL ?? 'http://localhost:3333'

interface DestinationGuides {
  destinationTitle: string;
  guides: GuideCardGuide[];
}

async function fetchDestinationGuides(slug: string): Promise<DestinationGuides> {
  try {
    const [destRes, guidesRes] = await Promise.all([
      fetch(`${API_URL}/destinations/${slug}`, { next: { revalidate: 60 } }),
      fetch(`${API_URL}/destinations/${slug}/guides`, { next: { revalidate: 60 } }),
    ])
    const destination = destRes.ok ? await destRes.json() : null
    const guides: GuideCardGuide[] = guidesRes.ok ? await guidesRes.json() : []
    return {
      destinationTitle: destination?.title ?? slug,
      guides: Array.isArray(guides) ? guides : [],
    }
  } catch {
    return { destinationTitle: slug, guides: [] }
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ 'destination-slug': string }>;
}): Promise<Metadata> {
  const { 'destination-slug': slug } = await params;
  const { destinationTitle } = await fetchDestinationGuides(slug);
  return {
    title: 'Guias',
    description: `Guias certificados disponíveis em ${destinationTitle}. Compare especialidades, avaliações e roteiros.`,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ 'destination-slug': string }>;
}

export default async function DestinationGuiasPage({ params }: Props) {
  const { 'destination-slug': slug } = await params;
  const { destinationTitle, guides } = await fetchDestinationGuides(slug);

  return (
    <>
      <style>{`
        /* ── Layout ── */
        .dguias {
          min-height: 100dvh;
          background: var(--stone-50, #fafaf9);
        }

        /* ── Header ── */
        .dguias__header {
          background: var(--stone-900, #1c1917);
          color: #fff;
          padding: clamp(48px, 8vw, 80px) clamp(16px, 5vw, 64px) clamp(32px, 5vw, 48px);
        }

        .dguias__breadcrumb {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--stone-400, #a8a29e);
          text-decoration: none;
          margin-bottom: 20px;
          transition: color 0.15s;
        }
        .dguias__breadcrumb:hover {
          color: #fff;
        }

        .dguias__eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ochre, #c2783c);
          margin: 0 0 8px;
        }

        .dguias__title {
          font-family: var(--font-display, Georgia, serif);
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 700;
          line-height: 1.15;
          margin: 0 0 8px;
          color: #fff;
        }

        .dguias__subtitle {
          font-size: 15px;
          color: var(--stone-400, #a8a29e);
          margin: 0;
        }

        /* ── Body ── */
        .dguias__body {
          max-width: 1120px;
          margin: 0 auto;
          padding: clamp(24px, 5vw, 48px) clamp(16px, 5vw, 64px);
        }

        /* ── Grid ── */
        .dguias__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }

        /* ── Count badge ── */
        .dguias__count {
          font-size: 13px;
          color: var(--stone-500, #78716c);
          margin: 0 0 24px;
        }
        .dguias__count strong {
          color: var(--stone-700, #44403c);
        }

        /* ── Mobile adjustments ── */
        @media (max-width: 480px) {
          .dguias__grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="dguias">
        {/* Header */}
        <header className="dguias__header">
          <Link href="/" style={{ display: 'inline-block', marginBottom: '12px' }}><Image src="/images/logo.png" alt="CAPI" width={90} height={81} style={{ filter: 'brightness(0) invert(1)', display: 'block' }} /></Link>
          <Link href={`/destinos/${slug}`} className="dguias__breadcrumb">
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
            {destinationTitle}
          </Link>
          <p className="dguias__eyebrow">Guias certificados</p>
          <h1 className="dguias__title">Escolha quem vai te guiar</h1>
          <p className="dguias__subtitle">
            Conheça os guias disponíveis em {destinationTitle}.
          </p>
        </header>

        {/* Body */}
        <main className="dguias__body">
          {guides.length > 0 ? (
            <>
              <p className="dguias__count">
                <strong>{guides.length}</strong>{' '}
                {guides.length === 1 ? 'guia disponível' : 'guias disponíveis'}
              </p>
              <div className="dguias__grid" id="guias">
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
                Nenhum guia cadastrado em {destinationTitle} ainda.
              </p>
              <p style={{ fontSize: '14px', color: 'var(--stone-400)' }}>
                Em breve novos condutores estarão disponíveis neste destino.
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
