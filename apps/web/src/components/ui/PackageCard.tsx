import Link from 'next/link';
import Image from 'next/image';

const FALLBACK_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiM1QzNEMkEiLz48L3N2Zz4=';

export interface PackageCardPackage {
  id: string;
  name: string;
  durationMinutes: number;
  priceFrom: number; // minimum price in BRL cents
  difficulty: 'EASY' | 'MODERATE' | 'HARD';
  coverImageUrl?: string | null;
  coverImageBlurDataUrl?: string | null;
  tags: string[];
}

export interface PackageCardProps {
  package: PackageCardPackage;
  /** Full href — card is route-agnostic */
  href: string;
}

const DIFFICULTY_LABELS: Record<PackageCardPackage['difficulty'], string> = {
  EASY: 'Fácil',
  MODERATE: 'Moderado',
  HARD: 'Difícil',
};

const DIFFICULTY_STYLES: Record<
  PackageCardPackage['difficulty'],
  { background: string; color: string; border: string; className: string }
> = {
  EASY: {
    background: '#dcfce7',
    color: '#166534',
    border: '#bbf7d0',
    className: 'pkgcard__badge--easy',
  },
  MODERATE: {
    background: '#fef9c3',
    color: '#854d0e',
    border: '#fef08a',
    className: 'pkgcard__badge--moderate',
  },
  HARD: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '#fecaca',
    className: 'pkgcard__badge--hard',
  },
};

/** Format duration: "4h", "2h 30min", "45min" */
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** Format price from cents to BRL currency string */
function formatPrice(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export default function PackageCard({ package: pkg, href }: PackageCardProps) {
  const difficulty = DIFFICULTY_STYLES[pkg.difficulty];

  return (
    <>
      <style>{`
        .pkgcard {
          display: block;
          text-decoration: none;
          color: inherit;
          background: #fff;
          border: 1px solid var(--stone-200);
          border-radius: 12px;
          overflow: hidden;
          transition: box-shadow 0.25s ease, transform 0.25s ease;
        }

        .pkgcard:hover {
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.10);
          transform: translateY(-3px);
        }

        .pkgcard:focus-visible {
          outline: 2px solid var(--ochre);
          outline-offset: 2px;
        }

        /* Photo */
        .pkgcard__photo {
          position: relative;
          width: 100%;
          aspect-ratio: 4/3;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pkgcard__photo-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, var(--stone-800), var(--stone-700));
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--stone-600);
        }

        /* Body */
        .pkgcard__body {
          padding: 1rem 1.1rem 1.1rem;
        }

        .pkgcard__name {
          font-family: var(--font-display), Georgia, serif;
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: -0.015em;
          color: var(--stone-900);
          margin-bottom: 0.5rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Difficulty badge */
        .pkgcard__badge {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 0.18rem 0.55rem;
          border-radius: 2px;
          border-width: 1px;
          border-style: solid;
          margin-bottom: 0.5rem;
          white-space: nowrap;
        }

        /* Tags */
        .pkgcard__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
          margin-bottom: 0.75rem;
        }

        .pkgcard__tag {
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ochre-dark);
          background: var(--stone-100);
          border: 1px solid var(--stone-200);
          padding: 0.18rem 0.55rem;
          border-radius: 2px;
          white-space: nowrap;
        }

        /* Footer: price + duration */
        .pkgcard__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .pkgcard__price {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--stone-700);
        }

        .pkgcard__duration {
          font-size: 0.875rem;
          font-weight: 400;
          color: var(--stone-500);
        }
      `}</style>

      <Link href={href} className="pkgcard">
        {/* Photo */}
        <div className="pkgcard__photo">
          {pkg.coverImageUrl ? (
            <Image
              src={pkg.coverImageUrl}
              alt={pkg.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL={pkg.coverImageBlurDataUrl ?? FALLBACK_BLUR}
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
          ) : (
            <div className="pkgcard__photo-placeholder" aria-hidden="true">
              {/* Landscape icon */}
              <svg
                width="52"
                height="52"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 15l5-5 4 4 3-3 6 6" />
                <circle cx="8.5" cy="8.5" r="1.5" />
              </svg>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="pkgcard__body">
          <h3 className="pkgcard__name">{pkg.name}</h3>

          {/* Difficulty badge */}
          <span
            className={`pkgcard__badge ${difficulty.className}`}
            style={{
              background: difficulty.background,
              color: difficulty.color,
              borderColor: difficulty.border,
            }}
          >
            {DIFFICULTY_LABELS[pkg.difficulty]}
          </span>

          {/* Tags (max 3) */}
          {pkg.tags.length > 0 && (
            <div className="pkgcard__tags" aria-label="Tags do roteiro">
              {pkg.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="pkgcard__tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="pkgcard__footer">
            <span className="pkgcard__price">
              A partir de {formatPrice(pkg.priceFrom)}
            </span>
            <span className="pkgcard__duration">
              {formatDuration(pkg.durationMinutes)}
            </span>
          </div>
        </div>
      </Link>
    </>
  );
}
