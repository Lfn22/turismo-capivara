import type { Metadata } from 'next';
import Link from 'next/link';
import PackageCard, {
  PackageCardPackage,
} from '@/src/components/ui/PackageCard';

// ── Data layer ────────────────────────────────────────────────────────────────

const API_URL = process.env.API_URL ?? 'http://localhost:3333';

interface ApiPackage {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  price: number;    // decimal, e.g. 120.00
  difficulty: 'EASY' | 'MODERATE' | 'HARD';
  durationMinHours: number | null;
  durationMaxHours: number | null;
  tenantSlug: string;
}

interface DestinationPackages {
  destinationTitle: string;
  packages: PackageCardPackage[];
}

async function fetchDestinationPackages(slug: string): Promise<DestinationPackages> {
  try {
    const [destRes, packagesRes] = await Promise.all([
      fetch(`${API_URL}/destinations/${slug}`, { next: { revalidate: 3600 } }),
      fetch(`${API_URL}/destinations/${slug}/packages`, { next: { revalidate: 300 } }),
    ]);
    const destination = destRes.ok ? await destRes.json() : null;
    const raw: ApiPackage[] = packagesRes.ok ? await packagesRes.json() : [];
    const packages = Array.isArray(raw)
      ? raw.map((p): PackageCardPackage => ({
          id: p.id,
          name: p.name,
          durationMinutes: p.duration,
          priceFrom: Math.round(p.price * 100), // decimal → cents
          difficulty: p.difficulty,
          coverImageUrl: null,   // API does not return photos yet
          coverImageBlurDataUrl: null,
          tags: [],
        }))
      : [];
    return {
      destinationTitle: destination?.title ?? slug,
      packages,
    };
  } catch {
    return { destinationTitle: slug, packages: [] };
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ 'destination-slug': string }>;
}): Promise<Metadata> {
  const { 'destination-slug': slug } = await params;
  const { destinationTitle } = await fetchDestinationPackages(slug);
  return {
    title: 'Roteiros',
    description: `Roteiros disponíveis em ${destinationTitle}. Compare duração, dificuldade e preços.`,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ 'destination-slug': string }>;
}

export default async function DestinationRoteirosPage({ params }: Props) {
  const { 'destination-slug': slug } = await params;
  const { destinationTitle, packages } = await fetchDestinationPackages(slug);

  return (
    <>
      <style>{`
        /* ── Layout ── */
        .droteiros {
          min-height: 100dvh;
          background: var(--stone-50, #fafaf9);
        }

        /* ── Header ── */
        .droteiros__header {
          background: var(--stone-900, #1c1917);
          color: #fff;
          padding: clamp(48px, 8vw, 80px) clamp(16px, 5vw, 64px) clamp(32px, 5vw, 48px);
        }

        .droteiros__breadcrumb {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--stone-400, #a8a29e);
          text-decoration: none;
          margin-bottom: 20px;
          transition: color 0.15s;
        }
        .droteiros__breadcrumb:hover {
          color: #fff;
        }

        .droteiros__eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ochre, #c2783c);
          margin: 0 0 8px;
        }

        .droteiros__title {
          font-family: var(--font-display, Georgia, serif);
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 700;
          line-height: 1.15;
          margin: 0 0 8px;
          color: #fff;
        }

        .droteiros__subtitle {
          font-size: 15px;
          color: var(--stone-400, #a8a29e);
          margin: 0;
        }

        /* ── Body ── */
        .droteiros__body {
          max-width: 1120px;
          margin: 0 auto;
          padding: clamp(24px, 5vw, 48px) clamp(16px, 5vw, 64px);
        }

        /* ── Grid ── */
        .droteiros__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }

        /* ── Count badge ── */
        .droteiros__count {
          font-size: 13px;
          color: var(--stone-500, #78716c);
          margin: 0 0 24px;
        }
        .droteiros__count strong {
          color: var(--stone-700, #44403c);
        }

        /* ── Mobile adjustments ── */
        @media (max-width: 480px) {
          .droteiros__grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="droteiros">
        {/* Header */}
        <header className="droteiros__header">
          <Link href={`/destinos/${slug}`} className="droteiros__breadcrumb">
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
          <p className="droteiros__eyebrow">Roteiros disponíveis</p>
          <h1 className="droteiros__title">Escolha sua aventura</h1>
          <p className="droteiros__subtitle">
            Roteiros com guias certificados em {destinationTitle}.
          </p>
        </header>

        {/* Body */}
        <main className="droteiros__body">
          {packages.length > 0 ? (
            <>
              <p className="droteiros__count">
                <strong>{packages.length}</strong>{' '}
                {packages.length === 1 ? 'roteiro disponível' : 'roteiros disponíveis'}
              </p>
              <div className="droteiros__grid" id="roteiros">
                {packages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    package={pkg}
                    href={`/destinos/${slug}/roteiros/${pkg.id}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '64px 24px' }}>
              <p style={{ fontSize: '16px', color: 'var(--stone-500)', marginBottom: '8px' }}>
                Nenhum roteiro cadastrado em {destinationTitle} ainda.
              </p>
              <p style={{ fontSize: '14px', color: 'var(--stone-400)' }}>
                Em breve novos roteiros estarão disponíveis neste destino.
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
