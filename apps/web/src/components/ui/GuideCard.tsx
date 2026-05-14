import Link from 'next/link';
import Image from 'next/image';

const FALLBACK_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiM5Qzc4NjAiLz48L3N2Zz4=';

export interface GuideCardGuide {
  id: string;
  name: string;
  photoUrl?: string | null;
  photoBlurDataUrl?: string | null;
  specialties: string[];
  packageCount: number;
  rating?: number | null;
  reviewCount?: number | null;
}

export interface GuideCardProps {
  guide: GuideCardGuide;
  /** Href completo — o card é agnóstico de estrutura de rota */
  href: string;
}

export default function GuideCard({ guide, href }: GuideCardProps) {
  return (
    <>
      <style>{`
        .gcard {
          display: block;
          text-decoration: none;
          color: inherit;
          background: #fff;
          border: 1px solid var(--stone-200);
          border-radius: 3px;
          overflow: hidden;
          transition: box-shadow 0.2s, transform 0.2s;
        }

        .gcard:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.10);
          transform: translateY(-2px);
        }

        /* Foto */
        .gcard__photo {
          position: relative;
          width: 100%;
          aspect-ratio: 4/3;
          background: var(--stone-100);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gcard__photo-placeholder {
          color: var(--stone-400);
        }

        /* Body */
        .gcard__body {
          padding: 1rem 1.1rem 1.1rem;
        }

        .gcard__name {
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

        /* Tags de especialidade */
        .gcard__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
          margin-bottom: 0.75rem;
        }

        .gcard__tag {
          font-size: 0.68rem;
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

        /* Footer: roteiros + rating */
        .gcard__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: var(--stone-500);
        }

        .gcard__packages {
          font-size: 0.8rem;
          color: var(--stone-500);
        }

        .gcard__rating {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--stone-700);
        }

        .gcard__star {
          color: var(--ochre);
          font-size: 0.75rem;
        }

        .gcard__review-count {
          font-weight: 400;
          color: var(--stone-400);
        }
      `}</style>

      <Link href={href} className="gcard">
        {/* Foto */}
        <div className="gcard__photo">
          {guide.photoUrl ? (
            <Image
              src={guide.photoUrl}
              alt={guide.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL={guide.photoBlurDataUrl ?? FALLBACK_BLUR}
              style={{ objectFit: 'cover', objectPosition: 'center top' }}
            />
          ) : (
            <div className="gcard__photo-placeholder" aria-hidden="true">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.25"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="gcard__body">
          <h3 className="gcard__name">{guide.name}</h3>

          {guide.specialties.length > 0 && (
            <div className="gcard__tags" aria-label="Especialidades">
              {guide.specialties.slice(0, 3).map((s) => (
                <span key={s} className="gcard__tag">{s}</span>
              ))}
            </div>
          )}

          <div className="gcard__footer">
            <span className="gcard__packages">
              {guide.packageCount}{' '}
              {guide.packageCount === 1 ? 'roteiro' : 'roteiros'}
            </span>

            {guide.rating != null && (
              <span className="gcard__rating" aria-label={`Avaliação: ${guide.rating}`}>
                <span className="gcard__star" aria-hidden="true">★</span>
                {guide.rating.toFixed(1)}
                {guide.reviewCount != null && (
                  <span className="gcard__review-count">
                    ({guide.reviewCount})
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </Link>
    </>
  );
}
